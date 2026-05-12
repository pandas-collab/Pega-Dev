using System;

namespace Pegasus.Domain.Entities
{
    public class Claim : BaseEntity
    {
        public string ClaimNumber { get; set; } = string.Empty;
        public Guid PolicyId { get; set; }
        public virtual Policy Policy { get; set; } = null!;
        public string ClaimType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal ClaimAmount { get; set; }
        public DateTime IncidentDate { get; set; }
        public string Status { get; set; } = "Submitted";
        public string? AssignedTo { get; set; }
        public DateTime? ProcessedDate { get; set; }
    }
}
