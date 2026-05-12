using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using Microsoft.IdentityModel.Tokens;
using Pegasus.Core.Models.Auth;
using Pegasus.Core.Security;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Pegasus.Core.Services
{
    public interface IAuthService
    {
        Task<AuthResult> LoginAsync(LoginRequest request);
        Task<AuthResult> AzureLoginAsync(string accessToken);
        Task<AuthResult> RefreshTokenAsync(string refreshToken);
        Task LogoutAsync(string userId);
        Task<UserInfo> GetUserInfoAsync(string userId);
        Task<bool> ValidateTokenAsync(string token);
        Task<bool> HasPermissionAsync(string userId, string permission);
        Task<IEnumerable<string>> GetUserRolesAsync(string userId);
    }

    public class AuthService : IAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly ITokenValidationService _tokenValidationService;
        private readonly IRoleBasedAuthorizationService _authorizationService;
        private readonly Dictionary<string, RefreshTokenInfo> _refreshTokens;

        public AuthService(
            IConfiguration configuration,
            ILogger<AuthService> logger,
            IJwtTokenGenerator jwtTokenGenerator,
            ITokenValidationService tokenValidationService,
            IRoleBasedAuthorizationService authorizationService)
        {
            _configuration = configuration;
            _logger = logger;
            _jwtTokenGenerator = jwtTokenGenerator;
            _tokenValidationService = tokenValidationService;
            _authorizationService = authorizationService;
            _refreshTokens = new Dictionary<string, RefreshTokenInfo>();
        }

        public async Task<AuthResult> LoginAsync(LoginRequest request)
        {
            try
            {
                // Validate credentials (implement your user validation logic)
                var user = await ValidateUserCredentialsAsync(request.Email, request.Password);
                if (user == null)
                {
                    return AuthResult.Failure("Invalid credentials");
                }

                // Generate JWT token
                var token = await _jwtTokenGenerator.GenerateTokenAsync(user);
                var refreshToken = GenerateRefreshToken();

                // Store refresh token
                _refreshTokens[refreshToken] = new RefreshTokenInfo
                {
                    UserId = user.Id,
                    ExpiresAt = DateTime.UtcNow.AddDays(30),
                    IsActive = true
                };

                return AuthResult.Success(token, refreshToken, user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login failed for user {Email}", request.Email);
                return AuthResult.Failure("Authentication failed");
            }
        }

        public async Task<AuthResult> AzureLoginAsync(string accessToken)
        {
            try
            {
                // Validate Azure AD token
                var azureUser = await ValidateAzureTokenAsync(accessToken);
                if (azureUser == null)
                {
                    return AuthResult.Failure("Invalid Azure AD token");
                }

                // Get or create user from Azure AD info
                var user = await GetOrCreateUserFromAzureAsync(azureUser);

                // Generate our JWT token
                var token = await _jwtTokenGenerator.GenerateTokenAsync(user);
                var refreshToken = GenerateRefreshToken();

                // Store refresh token
                _refreshTokens[refreshToken] = new RefreshTokenInfo
                {
                    UserId = user.Id,
                    ExpiresAt = DateTime.UtcNow.AddDays(30),
                    IsActive = true
                };

                return AuthResult.Success(token, refreshToken, user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Azure AD login failed");
                return AuthResult.Failure("Azure AD authentication failed");
            }
        }

        public async Task<AuthResult> RefreshTokenAsync(string refreshToken)
        {
            try
            {
                if (!_refreshTokens.TryGetValue(refreshToken, out var tokenInfo) ||
                    !tokenInfo.IsActive ||
                    tokenInfo.ExpiresAt < DateTime.UtcNow)
                {
                    return AuthResult.Failure("Invalid refresh token");
                }

                // Get user info
                var user = await GetUserByIdAsync(tokenInfo.UserId);
                if (user == null)
                {
                    return AuthResult.Failure("User not found");
                }

                // Generate new tokens
                var newToken = await _jwtTokenGenerator.GenerateTokenAsync(user);
                var newRefreshToken = GenerateRefreshToken();

                // Invalidate old refresh token and store new one
                _refreshTokens[refreshToken] = tokenInfo with { IsActive = false };
                _refreshTokens[newRefreshToken] = new RefreshTokenInfo
                {
                    UserId = user.Id,
                    ExpiresAt = DateTime.UtcNow.AddDays(30),
                    IsActive = true
                };

                return AuthResult.Success(newToken, newRefreshToken, user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token refresh failed");
                return AuthResult.Failure("Token refresh failed");
            }
        }

        public async Task LogoutAsync(string userId)
        {
            try
            {
                // Invalidate all refresh tokens for the user
                var userTokens = _refreshTokens.Where(rt => rt.Value.UserId == userId).ToList();
                foreach (var token in userTokens)
                {
                    _refreshTokens[token.Key] = token.Value with { IsActive = false };
                }

                _logger.LogInformation("User {UserId} logged out successfully", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Logout failed for user {UserId}", userId);
                throw;
            }
        }

        public async Task<UserInfo> GetUserInfoAsync(string userId)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null)
                {
                    throw new InvalidOperationException("User not found");
                }

                var roles = await GetUserRolesAsync(userId);

                return new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    Roles = roles.ToList(),
                    LastLoginAt = user.LastLoginAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get user info for {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                return await _tokenValidationService.ValidateTokenAsync(token);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token validation failed");
                return false;
            }
        }

        public async Task<bool> HasPermissionAsync(string userId, string permission)
        {
            try
            {
                return await _authorizationService.HasPermissionAsync(userId, permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Permission check failed for user {UserId}", userId);
                return false;
            }
        }

        public async Task<IEnumerable<string>> GetUserRolesAsync(string userId)
        {
            try
            {
                return await _authorizationService.GetUserRolesAsync(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get roles for user {UserId}", userId);
                return Enumerable.Empty<string>();
            }
        }

        private async Task<AzureUserInfo> ValidateAzureTokenAsync(string accessToken)
        {
            // Implement Azure AD token validation
            // This would use Microsoft.Identity.Client or Microsoft.Graph
            await Task.CompletedTask;
            return new AzureUserInfo(); // Placeholder
        }

        private async Task<User> ValidateUserCredentialsAsync(string email, string password)
        {
            // Implement user credential validation
            await Task.CompletedTask;
            return new User { Id = "test", Email = email, Name = "Test User" }; // Placeholder
        }

        private async Task<User> GetOrCreateUserFromAzureAsync(AzureUserInfo azureUser)
        {
            // Implement user creation/retrieval from Azure AD info
            await Task.CompletedTask;
            return new User(); // Placeholder
        }

        private async Task<User> GetUserByIdAsync(string userId)
        {
            // Implement user retrieval by ID
            await Task.CompletedTask;
            return new User { Id = userId }; // Placeholder
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }
    }

    public record RefreshTokenInfo
    {
        public string UserId { get; init; }
        public DateTime ExpiresAt { get; init; }
        public bool IsActive { get; init; }
    }
}
