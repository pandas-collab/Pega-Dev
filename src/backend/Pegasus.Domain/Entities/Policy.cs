using System;
using System.Collections.Generic;

namespace Pegasus.Domain.Entities
{
    public class Policy : BaseEntity
    {
        public string PolicyNumber { get; set; } = string.Empty;
        public string PolicyHolderName { get; set; } = string.Empty;
        public string PolicyHolderEmail { get; set; } = string.Empty;
        public string PolicyType { get; set; } = string.Empty;
        public decimal PremiumAmount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = "Active";
        public virtual ICollection<Claim> Claims { get; set; } = new List<Claim>();
    }
}
