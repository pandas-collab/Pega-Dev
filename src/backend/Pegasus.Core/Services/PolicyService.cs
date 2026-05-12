using Pegasus.Core.Business.PolicyLogic;
using Pegasus.Domain.Entities;
using Pegasus.Infrastructure.Repositories;
using System.ComponentModel.DataAnnotations;

namespace Pegasus.Core.Services
{
    public interface IPolicyService
    {
        Task<IEnumerable<Policy>> GetPoliciesAsync(string userId, string userRole, int page, int pageSize, string? status = null, string? customerId = null);
        Task<Policy?> GetPolicyByIdAsync(Guid id, string userId, string userRole);
        Task<Policy> CreatePolicyAsync(CreatePolicyRequest request, string userId, string userRole);
        Task<Policy?> UpdatePolicyAsync(Guid id, UpdatePolicyRequest request, string userId, string userRole);
        Task EndorsePolicyAsync(Guid id, EndorsePolicyRequest request, string userId, string userRole);
        Task CancelPolicyAsync(Guid id, CancelPolicyRequest request, string userId, string userRole);
        Task<IEnumerable<PolicyHistory>> GetPolicyHistoryAsync(Guid id, string userId, string userRole);
    }

    public class PolicyService : IPolicyService
    {
        private readonly IPolicyRepository _policyRepository;
        private readonly IPolicyValidator _policyValidator;
        private readonly IPolicyWorkflowEngine _workflowEngine;
        private readonly IPolicyLifecycleManager _lifecycleManager;
        private readonly ILogger<PolicyService> _logger;

        public PolicyService(
            IPolicyRepository policyRepository,
            IPolicyValidator policyValidator,
            IPolicyWorkflowEngine workflowEngine,
            IPolicyLifecycleManager lifecycleManager,
            ILogger<PolicyService> logger)
        {
            _policyRepository = policyRepository ?? throw new ArgumentNullException(nameof(policyRepository));
            _policyValidator = policyValidator ?? throw new ArgumentNullException(nameof(policyValidator));
            _workflowEngine = workflowEngine ?? throw new ArgumentNullException(nameof(workflowEngine));
            _lifecycleManager = lifecycleManager ?? throw new ArgumentNullException(nameof(lifecycleManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<IEnumerable<Policy>> GetPoliciesAsync(string userId, string userRole, int page, int pageSize, string? status = null, string? customerId = null)
        {
            try
            {
                // [RISK 1 MITIGATION] Apply role-based data filtering
                var filter = CreateSecurityFilter(userId, userRole);

                if (!string.IsNullOrEmpty(status))
                {
                    filter.Status = status;
                }

                if (!string.IsNullOrEmpty(customerId))
                {
                    filter.CustomerId = customerId;
                }

                // [RISK 5 MITIGATION] Use optimized pagination
                return await _policyRepository.GetPoliciesAsync(filter, page, pageSize);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving policies for user {UserId}", userId);
                throw;
            }
        }

        public async Task<Policy?> GetPolicyByIdAsync(Guid id, string userId, string userRole)
        {
            try
            {
                var policy = await _policyRepository.GetByIdAsync(id);

                if (policy == null)
                {
                    return null;
                }

                // [RISK 1 MITIGATION] Verify user has access to this policy
                if (!CanAccessPolicy(policy, userId, userRole))
                {
                    throw new UnauthorizedAccessException("Access denied to policy");
                }

                return policy;
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving policy {PolicyId} for user {UserId}", id, userId);
                throw;
            }
        }

        public async Task<Policy> CreatePolicyAsync(CreatePolicyRequest request, string userId, string userRole)
        {
            try
            {
                // [RISK 2 MITIGATION] Comprehensive validation
                await _policyValidator.ValidateCreateRequestAsync(request);

                // [RISK 3 MITIGATION] Business rule validation
                await _policyValidator.ValidateBusinessRulesAsync(request);

                var policy = new Policy
                {
                    Id = Guid.NewGuid(),
                    CustomerId = request.CustomerId,
                    PolicyNumber = await GeneratePolicyNumberAsync(),
                    ProductType = request.ProductType,
                    Premium = request.Premium,
                    CoverageAmount = request.CoverageAmount,
                    EffectiveDate = request.EffectiveDate,
                    ExpirationDate = request.ExpirationDate,
                    Status = PolicyStatus.Draft,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow,
                    Version = 1
                };

                // [RISK 3 MITIGATION] Initialize workflow state
                await _workflowEngine.InitializePolicyWorkflowAsync(policy);

                var createdPolicy = await _policyRepository.CreateAsync(policy);

                _logger.LogInformation("Policy {PolicyId} created by user {UserId}", createdPolicy.Id, userId);

                return createdPolicy;
            }
            catch (ValidationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating policy for user {UserId}", userId);
                throw;
            }
        }

        public async Task<Policy?> UpdatePolicyAsync(Guid id, UpdatePolicyRequest request, string userId, string userRole)
        {
            try
            {
                var existingPolicy = await _policyRepository.GetByIdAsync(id);

                if (existingPolicy == null)
                {
                    return null;
                }

                // [RISK 1 MITIGATION] Access control
                if (!CanModifyPolicy(existingPolicy, userId, userRole))
                {
                    throw new UnauthorizedAccessException("Access denied to modify policy");
                }

                // [RISK 4 MITIGATION] Optimistic concurrency check
                if (existingPolicy.Version != request.Version)
                {
                    throw new InvalidOperationException("Policy has been modified by another user. Please refresh and try again.");
                }

                // [RISK 3 MITIGATION] Validate state transition
                await _workflowEngine.ValidateUpdateAsync(existingPolicy, request);

                // [RISK 2 MITIGATION] Input validation
                await _policyValidator.ValidateUpdateRequestAsync(request, existingPolicy);

                // Apply updates
                existingPolicy.Premium = request.Premium;
                existingPolicy.CoverageAmount = request.CoverageAmount;
                existingPolicy.ModifiedBy = userId;
                existingPolicy.ModifiedDate = DateTime.UtcNow;
                existingPolicy.Version++;

                // [RISK 3 MITIGATION] Process workflow transition
                await _workflowEngine.ProcessUpdateAsync(existingPolicy, request);

                var updatedPolicy = await _policyRepository.UpdateAsync(existingPolicy);

                _logger.LogInformation("Policy {PolicyId} updated by user {UserId}", id, userId);

                return updatedPolicy;
            }
            catch (ValidationException)
            {
                throw;
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating policy {PolicyId} for user {UserId}", id, userId);
                throw;
            }
        }

        public async Task EndorsePolicyAsync(Guid id, EndorsePolicyRequest request, string userId, string userRole)
        {
            try
            {
                var policy = await _policyRepository.GetByIdAsync(id);

                if (policy == null)
                {
                    throw new ArgumentException("Policy not found");
                }

                // [RISK 1 MITIGATION] Authorization check for endorsements
                if (!CanEndorsePolicy(policy, userId, userRole))
                {
                    throw new UnauthorizedAccessException("Access denied to endorse policy");
                }

                // [RISK 3 MITIGATION] Validate endorsement business rules
                await _lifecycleManager.ValidateEndorsementAsync(policy, request);

                // Process endorsement
                await _lifecycleManager.ProcessEndorsementAsync(policy, request, userId);

                _logger.LogInformation("Policy {PolicyId} endorsed by user {UserId}", id, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error endorsing policy {PolicyId} for user {UserId}", id, userId);
                throw;
            }
        }

        public async Task CancelPolicyAsync(Guid id, CancelPolicyRequest request, string userId, string userRole)
        {
            try
            {
                var policy = await _policyRepository.GetByIdAsync(id);

                if (policy == null)
                {
                    throw new ArgumentException("Policy not found");
                }

                // [RISK 1 MITIGATION] Authorization check for cancellation
                if (!CanCancelPolicy(policy, userId, userRole))
                {
                    throw new UnauthorizedAccessException("Access denied to cancel policy");
                }

                // [RISK 3 MITIGATION] Validate cancellation business rules
                await _lifecycleManager.ValidateCancellationAsync(policy, request);

                // Process cancellation
                await _lifecycleManager.ProcessCancellationAsync(policy, request, userId);

                _logger.LogInformation("Policy {PolicyId} canceled by user {UserId}", id, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error canceling policy {PolicyId} for user {UserId}", id, userId);
                throw;
            }
        }

        public async Task<IEnumerable<PolicyHistory>> GetPolicyHistoryAsync(Guid id, string userId, string userRole)
        {
            try
            {
                var policy = await _policyRepository.GetByIdAsync(id);

                if (policy == null)
                {
                    throw new ArgumentException("Policy not found");
                }

                if (!CanAccessPolicy(policy, userId, userRole))
                {
                    throw new UnauthorizedAccessException("Access denied to policy history");
                }

                return await _policyRepository.GetPolicyHistoryAsync(id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving policy history for {PolicyId}", id);
                throw;
            }
        }

        // [RISK 1 MITIGATION] Security helper methods
        private PolicyFilter CreateSecurityFilter(string userId, string userRole)
        {
            var filter = new PolicyFilter();

            // Agents can only see their own policies
            if (userRole == "Agent")
            {
                filter.CreatedBy = userId;
            }
            // Managers can see policies in their territory/department
            else if (userRole == "Manager")
            {
                filter.Department = GetUserDepartment(userId);
            }
            // Admins can see all policies (no additional filter)

            return filter;
        }

        private bool CanAccessPolicy(Policy policy, string userId, string userRole)
        {
            return userRole switch
            {
                "Admin" => true,
                "Manager" => IsInSameDepartment(policy.CreatedBy, userId),
                "Agent" => policy.CreatedBy == userId,
                _ => false
            };
        }

        private bool CanModifyPolicy(Policy policy, string userId, string userRole)
        {
            // Additional checks for modification beyond read access
            if (policy.Status == PolicyStatus.Canceled || policy.Status == PolicyStatus.Expired)
            {
                return false;
            }

            return CanAccessPolicy(policy, userId, userRole);
        }

        private bool CanEndorsePolicy(Policy policy, string userId, string userRole)
        {
            return userRole is "Manager" or "Admin" && CanAccessPolicy(policy, userId, userRole);
        }

        private bool CanCancelPolicy(Policy policy, string userId, string userRole)
        {
            return userRole is "Manager" or "Admin" && CanAccessPolicy(policy, userId, userRole);
        }

        private async Task<string> GeneratePolicyNumberAsync()
        {
            // Generate unique policy number
            var prefix = DateTime.UtcNow.ToString("yyyyMM");
            var sequence = await _policyRepository.GetNextSequenceNumberAsync(prefix);
            return $"{prefix}-{sequence:D6}";
        }

        private string GetUserDepartment(string userId)
        {
            // Implementation would retrieve user's department from user service
            return "DEFAULT";
        }

        private bool IsInSameDepartment(string creatorUserId, string accessorUserId)
        {
            // Implementation would check if users are in same department
            return GetUserDepartment(creatorUserId) == GetUserDepartment(accessorUserId);
        }
    }

    // Request/Response DTOs
    public class CreatePolicyRequest
    {
        public string CustomerId { get; set; } = string.Empty;
        public string ProductType { get; set; } = string.Empty;
        public decimal Premium { get; set; }
        public decimal CoverageAmount { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime ExpirationDate { get; set; }
    }

    public class UpdatePolicyRequest
    {
        public decimal Premium { get; set; }
        public decimal CoverageAmount { get; set; }
        public int Version { get; set; }
    }

    public class EndorsePolicyRequest
    {
        public string EndorsementType { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public Dictionary<string, object> Changes { get; set; } = new();
    }

    public class CancelPolicyRequest
    {
        public string Reason { get; set; } = string.Empty;
        public DateTime CancellationDate { get; set; }
        public bool ProRateRefund { get; set; }
    }

    public class PolicyFilter
    {
        public string? Status { get; set; }
        public string? CustomerId { get; set; }
        public string? CreatedBy { get; set; }
        public string? Department { get; set; }
    }
}
