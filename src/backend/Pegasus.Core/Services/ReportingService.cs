using Microsoft.Extensions.Logging;
using Pegasus.Core.Reports;
using System.Text.Json;

namespace Pegasus.Core.Services
{
    public interface IReportingService
    {
        Task<IEnumerable<ReportTemplate>> GetAvailableTemplatesAsync(string userId);
        Task<ReportResult> GenerateReportAsync(object request, string userId);
        Task<DashboardAnalytics> GetDashboardAnalyticsAsync(string userId, string timeRange);
        Task<ReportResult> GenerateComplianceReportAsync(string reportType, DateTime? startDate, DateTime? endDate, string userId);
        Task<ReportHistoryResult> GetReportHistoryAsync(string userId, int page, int pageSize);
    }

    public class ReportingService : IReportingService
    {
        private readonly ILogger<ReportingService> _logger;
        private readonly IReportTemplateManager _templateManager;
        private readonly IReportGenerator _reportGenerator;
        private readonly IReportRepository _reportRepository;

        public ReportingService(
            ILogger<ReportingService> logger,
            IReportTemplateManager templateManager,
            IReportGenerator reportGenerator,
            IReportRepository reportRepository)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _templateManager = templateManager ?? throw new ArgumentNullException(nameof(templateManager));
            _reportGenerator = reportGenerator ?? throw new ArgumentNullException(nameof(reportGenerator));
            _reportRepository = reportRepository ?? throw new ArgumentNullException(nameof(reportRepository));
        }

        public async Task<IEnumerable<ReportTemplate>> GetAvailableTemplatesAsync(string userId)
        {
            _logger.LogInformation("Retrieving available report templates for user {UserId}", userId);

            try
            {
                var templates = await _templateManager.GetTemplatesForUserAsync(userId);
                return templates.Where(t => t.IsActive);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving templates for user {UserId}", userId);
                throw;
            }
        }

        public async Task<ReportResult> GenerateReportAsync(object request, string userId)
        {
            _logger.LogInformation("Generating report for user {UserId}", userId);

            try
            {
                var reportRequest = JsonSerializer.Deserialize<ReportRequest>(JsonSerializer.Serialize(request));

                // Validate request parameters
                if (string.IsNullOrEmpty(reportRequest.TemplateId))
                    throw new ArgumentException("Template ID is required");

                // Get template and validate user access
                var template = await _templateManager.GetTemplateAsync(reportRequest.TemplateId);
                if (template == null)
                    throw new ArgumentException("Invalid template ID");

                if (!await _templateManager.CanUserAccessTemplateAsync(userId, reportRequest.TemplateId))
                    throw new UnauthorizedAccessException("User does not have access to this template");

                // Generate report with security context
                var reportContext = new ReportContext
                {
                    UserId = userId,
                    Template = template,
                    Parameters = reportRequest.Parameters ?? new Dictionary<string, object>(),
                    Format = reportRequest.Format ?? "json",
                    StartDate = reportRequest.StartDate,
                    EndDate = reportRequest.EndDate
                };

                var result = await _reportGenerator.GenerateAsync(reportContext);

                // Log report generation for audit trail
                await _reportRepository.LogReportGenerationAsync(new ReportAuditLog
                {
                    UserId = userId,
                    TemplateId = reportRequest.TemplateId,
                    GeneratedAt = DateTime.UtcNow,
                    Parameters = JsonSerializer.Serialize(reportRequest.Parameters),
                    Success = true
                });

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report for user {UserId}", userId);

                // Log failed attempt
                await _reportRepository.LogReportGenerationAsync(new ReportAuditLog
                {
                    UserId = userId,
                    GeneratedAt = DateTime.UtcNow,
                    Success = false,
                    ErrorMessage = ex.Message
                });

                throw;
            }
        }

        public async Task<DashboardAnalytics> GetDashboardAnalyticsAsync(string userId, string timeRange)
        {
            _logger.LogInformation("Retrieving dashboard analytics for user {UserId}, range {TimeRange}", userId, timeRange);

            try
            {
                var dateRange = ParseTimeRange(timeRange);
                var analytics = await _reportGenerator.GetAnalyticsAsync(userId, dateRange.Start, dateRange.End);

                return analytics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving analytics for user {UserId}", userId);
                throw;
            }
        }

        public async Task<ReportResult> GenerateComplianceReportAsync(string reportType, DateTime? startDate, DateTime? endDate, string userId)
        {
            _logger.LogInformation("Generating compliance report {ReportType} for user {UserId}", reportType, userId);

            try
            {
                // Validate compliance report access
                if (!await _templateManager.CanUserAccessComplianceReportsAsync(userId))
                    throw new UnauthorizedAccessException("User does not have access to compliance reports");

                var template = await _templateManager.GetComplianceTemplateAsync(reportType);
                if (template == null)
                    throw new ArgumentException($"Unknown compliance report type: {reportType}");

                var reportContext = new ReportContext
                {
                    UserId = userId,
                    Template = template,
                    Parameters = new Dictionary<string, object>
                    {
                        ["startDate"] = startDate ?? DateTime.UtcNow.AddDays(-30),
                        ["endDate"] = endDate ?? DateTime.UtcNow,
                        ["complianceType"] = reportType
                    },
                    Format = "pdf" // Compliance reports default to PDF
                };

                var result = await _reportGenerator.GenerateComplianceReportAsync(reportContext);

                // Log compliance report generation
                await _reportRepository.LogComplianceReportAsync(new ComplianceReportLog
                {
                    UserId = userId,
                    ReportType = reportType,
                    GeneratedAt = DateTime.UtcNow,
                    StartDate = startDate,
                    EndDate = endDate
                });

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating compliance report {ReportType} for user {UserId}", reportType, userId);
                throw;
            }
        }

        public async Task<ReportHistoryResult> GetReportHistoryAsync(string userId, int page, int pageSize)
        {
            _logger.LogInformation("Retrieving report history for user {UserId}, page {Page}", userId, page);

            try
            {
                // Validate pagination parameters
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 10;

                var history = await _reportRepository.GetUserReportHistoryAsync(userId, page, pageSize);
                return history;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving report history for user {UserId}", userId);
                throw;
            }
        }

        private (DateTime Start, DateTime End) ParseTimeRange(string timeRange)
        {
            var end = DateTime.UtcNow;
            var start = timeRange.ToLower() switch
            {
                "7d" => end.AddDays(-7),
                "30d" => end.AddDays(-30),
                "90d" => end.AddDays(-90),
                "1y" => end.AddYears(-1),
                _ => end.AddDays(-30)
            };

            return (start, end);
        }
    }

    public class ReportRequest
    {
        public string TemplateId { get; set; }
        public Dictionary<string, object> Parameters { get; set; }
        public string Format { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
