using Pegasus.Core.Models.Auth;
using System.Security.Claims;

namespace Pegasus.Core.Security
{
    public interface IJwtTokenGenerator
    {
        Task<string> GenerateTokenAsync(User user);
        Task<string> GenerateTokenAsync(IEnumerable<Claim> claims);
        Task<ClaimsPrincipal> ValidateTokenAsync(string token);
        Task<bool> IsTokenValidAsync(string token);
        string GenerateRefreshToken();
    }
}
