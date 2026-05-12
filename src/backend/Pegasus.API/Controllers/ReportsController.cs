using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Pegasus.Core.Services;
using System.Security.Claims;

namespace Pegasus.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IReportingService _reportingService;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(IReportingService reportingService, ILogger<ReportsController> logger)
        {
            _reportingService = reportingService ?? throw new ArgumentNullException(nameof(reportingService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet("templates")]
        public async Task<IActionResult> GetReportTemplates()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var templates = await _reportingService.GetAvailableTemplatesAsync(userId);
                return Ok(templates);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving report templates");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateReport([FromBody] GenerateReportRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.TemplateId))
                {
                    return BadRequest("Invalid request parameters");
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var report = await _reportingService.GenerateReportAsync(request, userId);
                return Ok(report);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("dashboard/analytics")]
        public async Task<IActionResult> GetDashboardAnalytics([FromQuery] string timeRange = "30d")
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var analytics = await _reportingService.GetDashboardAnalyticsAsync(userId, timeRange);
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboard analytics");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("compliance/{reportType}")]
        public async Task<IActionResult> GetComplianceReport(string reportType, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var report = await _reportingService.GenerateComplianceReportAsync(reportType, startDate, endDate, userId);
                return Ok(report);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating compliance report");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetReportHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var history = await _reportingService.GetReportHistoryAsync(userId, page, pageSize);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving report history");
                return StatusCode(500, "Internal server error");
            }
        }
    }

    public class GenerateReportRequest
    {
        public string TemplateId { get; set; }
        public Dictionary<string, object> Parameters { get; set; } = new();
        public string Format { get; set; } = "json";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
