using Pegasus.Domain.Models;

namespace Pegasus.Core.Workflows
{
    public interface IWorkflowEngine
    {
        Task<bool> ProcessClaimAsync(Claim claim);
        Task<bool> ApproveClaimAsync(int claimId, string approver, string notes);
        Task<bool> RejectClaimAsync(int claimId, string approver, string reason);
        Task<bool> RequestDocumentsAsync(int claimId, string requester, string documentList);
    }
}
