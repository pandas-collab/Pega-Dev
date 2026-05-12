using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Pegasus.Core.Services;
using Pegasus.Domain.Entities;
using System.Security.Claims;

namespace Pegasus.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // [RISK 1 MITIGATION] Require authentication for all policy operations
    public class PolicyController : ControllerBase
    {
        private readonly IPolicyService _policyService;
        private readonly ILogger<PolicyController> _logger;

        public PolicyController(IPolicyService policyService, ILogger<PolicyController> logger)
        {
            _policyService = policyService ?? throw new ArgumentNullException(nameof(policyService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet]
        [Authorize(Roles = "Agent,Manager,Admin")] // [RISK 1 MITIGATION] Role-based access control
        public async Task<ActionResult<IEnumerable<Policy>>> GetPolicies(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null,
            [FromQuery] string? customerId = null)
        {
            try
            {
                // [RISK 5 MITIGATION] Implement pagination
                if (page < 1 || pageSize < 1 || pageSize > 100)
                {
                    return BadRequest("Invalid pagination parameters");
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                var policies = await _policyService.GetPoliciesAsync(userId, userRole, page, pageSize, status, customerId);
                return Ok(policies);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Unauthorized policy access attempt by user {UserId}: {Message}",
                    User.Identity?.Name, ex.Message);
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving policies");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Agent,Manager,Admin")]
        public async Task<ActionResult<Policy>> GetPolicy(Guid id)
        {
            try
            {
                // [RISK 2 MITIGATION] Validate input
                if (id == Guid.Empty)
                {
                    return BadRequest("Invalid policy ID");
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                var policy = await _policyService.GetPolicyByIdAsync(id, userId, userRole);

                if (policy == null)
                {
                    return NotFound();
                }

                return Ok(policy);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving policy {PolicyId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost]
        [Authorize(Roles = "Agent,Manager,Admin")]
        public async Task<ActionResult<Policy>> CreatePolicy([FromBody] CreatePolicyRequest request)
        {
            try
            {
                // [RISK 2 MITIGATION] Validate input data
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                var policy = await _policyService.CreatePolicyAsync(request, userId, userRole);

                return CreatedAtAction(nameof(GetPolicy), new { id = policy.Id }, policy);
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating policy");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Agent,Manager,Admin")]
        public async Task<ActionResult<Policy>> UpdatePolicy(Guid id, [FromBody] UpdatePolicyRequest request)
        {
            try
            {
                if (id == Guid.Empty || !ModelState.IsValid)
                {
                    return BadRequest("Invalid request data");
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                var policy = await _policyService.UpdatePolicyAsync(id, request, userId, userRole);

                if (policy == null)
                {
                    return NotFound();
                }

                return Ok(policy);
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message); // [RISK 4 MITIGATION] Handle concurrency conflicts
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating policy {PolicyId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("{id}/endorse")]
        [Authorize(Roles = "Manager,Admin")]
        public async Task<ActionResult> EndorsePolicy(Guid id, [FromBody] EndorsePolicyRequest request)
        {
            try
            {
                if (id == Guid.Empty || !ModelState.IsValid)
                {
                    return BadRequest("Invalid request data");
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                await _policyService.EndorsePolicyAsync(id, request, userId, userRole);

                return Ok();
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error endorsing policy {PolicyId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("{id}/cancel")]
        [Authorize(Roles = "Manager,Admin")]
        public async Task<ActionResult> CancelPolicy(Guid id, [FromBody] CancelPolicyRequest request)
        {
            try
            {
                if (id == Guid.Empty || !ModelState.IsValid)
                {
                    return BadRequest("Invalid request data");
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                await _policyService.CancelPolicyAsync(id, request, userId, userRole);

                return Ok();
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling policy {PolicyId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("{id}/history")]
        [Authorize(Roles = "Agent,Manager,Admin")]
        public async Task<ActionResult<IEnumerable<PolicyHistory>>> GetPolicyHistory(Guid id)
        {
            try
            {
                if (id == Guid.Empty)
                {
                    return BadRequest("Invalid policy ID");
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

                var history = await _policyService.GetPolicyHistoryAsync(id, userId, userRole);

                return Ok(history);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving policy history for {PolicyId}", id);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
