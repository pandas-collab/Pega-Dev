using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Pegasus.Core.Security
{
    public class TokenValidationService : ITokenValidationService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<TokenValidationService> _logger;
        private readonly HashSet<string> _blacklistedTokens;

        public TokenValidationService(IConfiguration configuration, ILogger<TokenValidationService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _blacklistedTokens = new HashSet<string>();
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                if (await IsTokenBlacklistedAsync(token))
                {
                    return false;
                }

                var tokenHandler = new JwtSecurityTokenHandler();
                var validationParameters = GetTokenValidationParameters();

                tokenHandler.ValidateToken(token, validationParameters, out _);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Token validation failed");
                return false;
            }
        }

        public async Task<bool> IsTokenBlacklistedAsync(string token)
        {
            try
            {
                return await Task.FromResult(_blacklistedTokens.Contains(token));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking token blacklist");
                return true; // Fail safe - treat as blacklisted if we can't check
            }
        }

        public async Task BlacklistTokenAsync(string token)
        {
            try
            {
                _blacklistedTokens.Add(token);
                _logger.LogInformation("Token blacklisted successfully");
                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error blacklisting token");
            }
        }

        public async Task<string> GetUserIdFromTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jsonToken = tokenHandler.ReadJwtToken(token);

                var userIdClaim = jsonToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier);
                return await Task.FromResult(userIdClaim?.Value ?? string.Empty);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting user ID from token");
                return string.Empty;
            }
        }

        private TokenValidationParameters GetTokenValidationParameters()
        {
            return new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:SecretKey"])),
                ValidateIssuer = true,
                ValidIssuer = _configuration["JwtSettings:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["JwtSettings:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        }
    }
}
