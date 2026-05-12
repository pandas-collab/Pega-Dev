using Microsoft.Extensions.Logging;
using Pegasus.Core.Models.Auth;

namespace Pegasus.Core.Security
{
    public class RoleBasedAuthorizationService : IRoleBasedAuthorizationService
    {
        private readonly ILogger<RoleBasedAuthorizationService> _logger;

        // In a real implementation, these would come from a database
        private readonly Dictionary<string, List<string>> _userRoles;
        private readonly Dictionary<string, List<string>> _rolePermissions;

        public RoleBasedAuthorizationService(ILogger<RoleBasedAuthorizationService> logger)
        {
            _logger = logger;
            _userRoles = new Dictionary<string, List<string>>();
            _rolePermissions = InitializeRolePermissions();
        }

        public async Task<bool> HasPermissionAsync(string userId, string permission)
        {
            try
            {
                var userRoles = await GetUserRolesAsync(userId);
                foreach (var role in userRoles)
                {
                    if (_rolePermissions.ContainsKey(role) && _rolePermissions[role].Contains(permission))
                    {
                        return true;
                    }
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking permission {Permission} for user {UserId}", permission, userId);
                return false;
            }
        }

        public async Task<bool> HasRoleAsync(string userId, string role)
        {
            try
            {
                var userRoles = await GetUserRolesAsync(userId);
                return userRoles.Contains(role);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking role {Role} for user {UserId}", role, userId);
                return false;
            }
        }

        public async Task<IEnumerable<string>> GetUserRolesAsync(string userId)
        {
            try
            {
                // In a real implementation, this would query the database
                if (_userRoles.ContainsKey(userId))
                {
                    return await Task.FromResult(_userRoles[userId]);
                }

                // Default role for new users
                return await Task.FromResult(new List<string> { "User" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting roles for user {UserId}", userId);
                return Enumerable.Empty<string>();
            }
        }

        public async Task<IEnumerable<string>> GetUserPermissionsAsync(string userId)
        {
            try
            {
                var userRoles = await GetUserRolesAsync(userId);
                var permissions = new HashSet<string>();

                foreach (var role in userRoles)
                {
                    if (_rolePermissions.ContainsKey(role))
                    {
                        foreach (var permission in _rolePermissions[role])
                        {
                            permissions.Add(permission);
                        }
                    }
                }

                return permissions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permissions for user {UserId}", userId);
                return Enumerable.Empty<string>();
            }
        }

        public async Task<bool> CanAccessResourceAsync(string userId, string resource, string action)
        {
            try
            {
                var permission = $"{resource}.{action}";
                return await HasPermissionAsync(userId, permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking resource access for user {UserId}", userId);
                return false;
            }
        }

        private Dictionary<string, List<string>> InitializeRolePermissions()
        {
            return new Dictionary<string, List<string>>
            {
                ["Admin"] = new List<string>
                {
                    "policies.read", "policies.write", "policies.delete",
                    "claims.read", "claims.write", "claims.delete",
                    "documents.read", "documents.write", "documents.delete",
                    "reports.read", "reports.write",
                    "users.read", "users.write", "users.delete"
                },
                ["Manager"] = new List<string>
                {
                    "policies.read", "policies.write",
                    "claims.read", "claims.write",
                    "documents.read", "documents.write",
                    "reports.read"
                },
                ["User"] = new List<string>
                {
                    "policies.read",
                    "claims.read",
                    "documents.read"
                }
            };
        }
    }
}
