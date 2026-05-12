using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Pegasus.Core.Security;

public interface ISecurityService
{
    Task<bool> ValidatePasswordPolicyAsync(string password);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hashedPassword);
    Task<List<string>> GetUserPermissionsAsync(string userId);
    Task<bool> HasPermissionAsync(string userId, string permission);
    Task<bool> HasRoleAsync(string userId, string role);
    ClaimsPrincipal CreateClaimsPrincipal(string userId, string email, List<string> roles, List<string> permissions);
}

public sealed class SecurityService : ISecurityService
{
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int Iterations = 100000;

    public async Task<bool> ValidatePasswordPolicyAsync(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return false;

        // Password policy requirements
        if (password.Length < 8)
            return false;

        if (password.Length > 128)
            return false;

        if (!password.Any(char.IsUpper))
            return false;

        if (!password.Any(char.IsLower))
            return false;

        if (!password.Any(char.IsDigit))
            return false;

        if (!password.Any(c => "!@#$%^&*()_+-=[]{}|;:,.<>?".Contains(c)))
            return false;

        // Check for common weak passwords
        var commonPasswords = new[]
        {
            "password", "123456", "password123", "admin", "qwerty",
            "letmein", "welcome", "monkey", "dragon", "pass123"
        };

        if (commonPasswords.Contains(password.ToLowerInvariant()))
            return false;

        await Task.CompletedTask; // Placeholder for async operations like breach checking
        return true;
    }

    public string HashPassword(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[SaltSize];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(HashSize);

        var hashBytes = new byte[SaltSize + HashSize];
        Array.Copy(salt, 0, hashBytes, 0, SaltSize);
        Array.Copy(hash, 0, hashBytes, SaltSize, HashSize);

        return Convert.ToBase64String(hashBytes);
    }

    public bool VerifyPassword(string password, string hashedPassword)
    {
        try
        {
            var hashBytes = Convert.FromBase64String(hashedPassword);
            var salt = new byte[SaltSize];
            Array.Copy(hashBytes, 0, salt, 0, SaltSize);

            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
            var hash = pbkdf2.GetBytes(HashSize);

            for (var i = 0; i < HashSize; i++)
            {
                if (hashBytes[i + SaltSize] != hash[i])
                    return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<List<string>> GetUserPermissionsAsync(string userId)
    {
        // Mock implementation - in a real application, this would query the database
        var permissions = new List<string>();

        // This would typically be retrieved from a database based on user roles
        await Task.CompletedTask;

        return permissions;
    }

    public async Task<bool> HasPermissionAsync(string userId, string permission)
    {
        var permissions = await GetUserPermissionsAsync(userId);
        return permissions.Contains(permission, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<bool> HasRoleAsync(string userId, string role)
    {
        // Mock implementation - in a real application, this would query the database
        await Task.CompletedTask;
        return false;
    }

    public ClaimsPrincipal CreateClaimsPrincipal(string userId, string email, List<string> roles, List<string> permissions)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Name, email)
        };

        // Add role claims
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        // Add permission claims
        claims.AddRange(permissions.Select(permission => new Claim("permission", permission)));

        var identity = new ClaimsIdentity(claims, "jwt");
        return new ClaimsPrincipal(identity);
    }
}
