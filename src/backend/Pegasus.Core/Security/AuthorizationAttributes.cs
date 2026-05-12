using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace Pegasus.Core.Security;

// Custom authorization attribute for role-based access control
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireRoleAttribute : Attribute, IAuthorizationFilter
{
    private readonly string[] _roles;

    public RequireRoleAttribute(params string[] roles)
    {
        _roles = roles ?? throw new ArgumentNullException(nameof(roles));
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (!user.Identity?.IsAuthenticated == true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var userRoles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

        if (!_roles.Any(role => userRoles.Contains(role, StringComparer.OrdinalIgnoreCase)))
        {
            context.Result = new ForbidResult();
        }
    }
}

// Custom authorization attribute for permission-based access control
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequirePermissionAttribute : Attribute, IAuthorizationFilter
{
    private readonly string[] _permissions;

    public RequirePermissionAttribute(params string[] permissions)
    {
        _permissions = permissions ?? throw new ArgumentNullException(nameof(permissions));
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (!user.Identity?.IsAuthenticated == true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var userPermissions = user.FindAll("permission").Select(c => c.Value).ToList();

        if (!_permissions.Any(permission => userPermissions.Contains(permission, StringComparer.OrdinalIgnoreCase)))
        {
            context.Result = new ForbidResult();
        }
    }
}

// Policy-based authorization requirements
public sealed class RoleRequirement : IAuthorizationRequirement
{
    public string[] Roles { get; }

    public RoleRequirement(params string[] roles)
    {
        Roles = roles ?? throw new ArgumentNullException(nameof(roles));
    }
}

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public string[] Permissions { get; }

    public PermissionRequirement(params string[] permissions)
    {
        Permissions = permissions ?? throw new ArgumentNullException(nameof(permissions));
    }
}

// Authorization handlers
public sealed class RoleAuthorizationHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var userRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

        if (requirement.Roles.Any(role => userRoles.Contains(role, StringComparer.OrdinalIgnoreCase)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userPermissions = context.User.FindAll("permission").Select(c => c.Value).ToList();

        if (requirement.Permissions.Any(permission => userPermissions.Contains(permission, StringComparer.OrdinalIgnoreCase)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

// Common roles and permissions constants
public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Agent = "Agent";
    public const string Customer = "Customer";
    public const string Adjuster = "Adjuster";
    public const string Underwriter = "Underwriter";
}

public static class Permissions
{
    // Policy permissions
    public const string CreatePolicy = "policy.create";
    public const string ReadPolicy = "policy.read";
    public const string UpdatePolicy = "policy.update";
    public const string DeletePolicy = "policy.delete";

    // Claim permissions
    public const string CreateClaim = "claim.create";
    public const string ReadClaim = "claim.read";
    public const string UpdateClaim = "claim.update";
    public const string ProcessClaim = "claim.process";
    public const string ApproveClaim = "claim.approve";

    // Document permissions
    public const string UploadDocument = "document.upload";
    public const string ReadDocument = "document.read";
    public const string DeleteDocument = "document.delete";

    // Report permissions
    public const string ViewReports = "report.view";
    public const string ExportReports = "report.export";

    // Admin permissions
    public const string ManageUsers = "user.manage";
    public const string ManageRoles = "role.manage";
}
