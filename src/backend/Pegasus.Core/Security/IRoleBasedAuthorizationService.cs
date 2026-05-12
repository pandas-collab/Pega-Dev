namespace Pegasus.Core.Security
{
    public interface IRoleBasedAuthorizationService
    {
        Task<bool> HasPermissionAsync(string userId, string permission);
        Task<bool> HasRoleAsync(string userId, string role);
        Task<IEnumerable<string>> GetUserRolesAsync(string userId);
        Task<IEnumerable<string>> GetUserPermissionsAsync(string userId);
        Task<bool> CanAccessResourceAsync(string userId, string resource, string action);
    }
}
