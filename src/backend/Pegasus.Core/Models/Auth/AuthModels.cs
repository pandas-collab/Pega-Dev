namespace Pegasus.Core.Models.Auth
{
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool RememberMe { get; set; }
    }

    public class AzureLoginRequest
    {
        public string AccessToken { get; set; } = string.Empty;
    }

    public class RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class ValidateTokenRequest
    {
        public string Token { get; set; } = string.Empty;
    }

    public class AuthResult
    {
        public bool IsSuccess { get; set; }
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public User User { get; set; } = new();
        public string ErrorMessage { get; set; } = string.Empty;

        public static AuthResult Success(string accessToken, string refreshToken, User user)
        {
            return new AuthResult
            {
                IsSuccess = true,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = user,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            };
        }

        public static AuthResult Failure(string errorMessage)
        {
            return new AuthResult
            {
                IsSuccess = false,
                ErrorMessage = errorMessage
            };
        }
    }

    public class User
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime? LastLoginAt { get; set; }
        public List<string> Roles { get; set; } = new();
    }

    public class UserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<string> Roles { get; set; } = new();
        public DateTime? LastLoginAt { get; set; }
    }

    public class AzureUserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
    }
}
