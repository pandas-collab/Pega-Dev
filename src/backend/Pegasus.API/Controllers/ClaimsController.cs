using Microsoft.AspNetCore.Mvc;
using Pegasus.Core.Services;
using System.Threading.Tasks;

namespace Pegasus.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClaimsController : ControllerBase
    {
        private readonly ClaimsService _claimsService;

        public ClaimsController(ClaimsService claimsService)
        {
            _claimsService = claimsService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateClaim([FromBody] object claimData)
        {
            var result = await _claimsService.CreateClaimAsync(claimData);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetClaim(int id)
        {
            var claim = await _claimsService.GetClaimAsync(id);
            return Ok(claim);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateClaim(int id, [FromBody] object claimData)
        {
            var result = await _claimsService.UpdateClaimAsync(id, claimData);
            return Ok(result);
        }

        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitClaim(int id)
        {
            var result = await _claimsService.SubmitClaimAsync(id);
            return Ok(result);
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveClaim(int id)
        {
            var result = await _claimsService.ApproveClaimAsync(id);
            return Ok(result);
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectClaim(int id)
        {
            var result = await _claimsService.RejectClaimAsync(id);
            return Ok(result);
        }
    }
}
