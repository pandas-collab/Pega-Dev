using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web;
using Pegasus.Core.Services;
using Pegasus.Core.Models.Auth;
using System.Security.Claims;

namespace Pegasus.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResult>> Login([FromBody] LoginRequest request)
        {
            try
            {
                var result = await _authService.LoginAsync(request);
                if (result.IsSuccess)
                {
                    return Ok(result);
                }
                return Unauthorized(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login failed for user {Email}", request.Email);
                return StatusCode(500, "Authentication failed");
            }
        }

        [HttpPost("azure-login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResult>> AzureLogin([FromBody] AzureLoginRequest request)
        {
            try
            {
                var result = await _authService.AzureLoginAsync(request.AccessToken);
                if (result.IsSuccess)
                {
                    return Ok(result);
                }
                return Unauthorized(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Azure AD login failed");
                return StatusCode(500, "Azure AD authentication failed");
            }
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResult>> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var result = await _authService.RefreshTokenAsync(request.RefreshToken);
                if (result.IsSuccess)
                {
                    return Ok(result);
                }
                return Unauthorized("Invalid refresh token");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token refresh failed");
                return StatusCode(500, "Token refresh failed");
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<ActionResult> Logout()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    await _authService.LogoutAsync(userId);
                }
                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Logout failed");
                return StatusCode(500, "Logout failed");
            }
        }

        [HttpGet("user-info")]
        [Authorize]
        public async Task<ActionResult<UserInfo>> GetUserInfo()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized();
                }

                var userInfo = await _authService.GetUserInfoAsync(userId);
                return Ok(userInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get user info");
                return StatusCode(500, "Failed to retrieve user information");
            }
        }

        [HttpPost("validate-token")]
        [AllowAnonymous]
        public async Task<ActionResult<bool>> ValidateToken([FromBody] ValidateTokenRequest request)
        {
            try
            {
                var isValid = await _authService.ValidateTokenAsync(request.Token);
                return Ok(new { isValid });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token validation failed");
                return Ok(new { isValid = false });
            }
        }
    }
}
