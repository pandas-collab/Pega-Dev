using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Pegasus.Core.Security
{
    public class JwtMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _configuration;
        private readonly ILogger<JwtMiddleware> _logger;

        public JwtMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<JwtMiddleware> logger)
        {
            _next = next;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var token = ExtractTokenFromRequest(context.Request);

            if (!string.IsNullOrEmpty(token))
            {
                await AttachUserToContextAsync(context, token);
            }

            await _next(context);
        }

        private string ExtractTokenFromRequest(HttpRequest request)
        {
            var authHeader = request.Headers["Authorization"].FirstOrDefault();
            if (authHeader != null && authHeader.StartsWith("Bearer "))
            {
                return authHeader["Bearer ".Length..].Trim();
            }

            // Also check for token in query parameters (for SignalR, etc.)
            return request.Query["access_token"].FirstOrDefault();
        }

        private async Task AttachUserToContextAsync(HttpContext context, string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_configuration["JwtSettings:SecretKey"]);

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _configuration["JwtSettings:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _configuration["JwtSettings:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
                context.User = principal;

                _logger.LogDebug("JWT token validated successfully for user {UserId}",
                    principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            }
            catch (SecurityTokenExpiredException)
            {
                _logger.LogWarning("JWT token has expired");
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "JWT token validation failed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while validating JWT token");
            }
        }
    }
}
