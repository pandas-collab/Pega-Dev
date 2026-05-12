using System.Threading.Tasks;
using System.Collections.Generic;

namespace Pegasus.Core.Workflows
{
    public class WorkflowEngine
    {
        private readonly Dictionary<string, IWorkflow> _workflows;

        public WorkflowEngine()
        {
            _workflows = new Dictionary<string, IWorkflow>();
            RegisterWorkflows();
        }

        public async Task<object> StartWorkflow(string workflowName, object data)
        {
            if (_workflows.TryGetValue(workflowName, out var workflow))
            {
                return await workflow.ExecuteAsync(data);
            }
            throw new System.ArgumentException($"Workflow '{workflowName}' not found");
        }

        public async Task ProcessApproval(int claimId)
        {
            var approvalWorkflow = _workflows["ApprovalWorkflow"] as ApprovalWorkflow;
            await approvalWorkflow?.ProcessApprovalAsync(claimId);
        }

        private void RegisterWorkflows()
        {
            _workflows["ClaimsWorkflow"] = new ClaimsWorkflow();
            _workflows["ApprovalWorkflow"] = new ApprovalWorkflow();
        }
    }

    public interface IWorkflow
    {
        Task<object> ExecuteAsync(object data);
    }
}
