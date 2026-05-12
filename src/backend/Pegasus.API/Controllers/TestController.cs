using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pegasus.Core.Security;

namespace Pegasus.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class TestController : ControllerBase
{
    [HttpGet("public")]
    public IActionResult PublicEndpoint()
    {
        return Ok(new { message = "This is a public endpoint accessible to everyone" });
    }

    [HttpGet("authenticated")]
    [Authorize]
    public IActionResult AuthenticatedEndpoint()
    {
        return Ok(new {
            message = "This endpoint requires authentication",
            user = User.Identity?.Name,
            isAuthenticated = User.Identity?.IsAuthenticated
        });
    }

    [HttpGet("admin-only")]
    [RequireRole(Roles.Admin)]
    public IActionResult AdminOnlyEndpoint()
    {
        return Ok(new {
            message = "This endpoint is only accessible to administrators",
            user = User.Identity?.Name,
            roles = User.Claims.Where(c => c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role").Select(c => c.Value)
        });
    }

    [HttpGet("agent-or-admin")]
    [RequireRole(Roles.Agent, Roles.Admin)]
    public IActionResult AgentOrAdminEndpoint()
    {
        return Ok(new {
            message = "This endpoint
