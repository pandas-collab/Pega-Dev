namespace Pegasus.Core.Security
{
    public interface ITokenValidationService
    {
        Task<bool> ValidateTokenAsync(string token);
        Task<bool> IsTokenBlacklistedAsync(string token);
        Task BlacklistTokenAsync(string token);
        Task<string> GetUserIdFromTokenAsync(string token);
    }
}
