using System;

namespace Pegasus.Domain.Entities
{
    public class Document : BaseEntity
    {
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public Guid? PolicyId { get; set; }
        public virtual Policy? Policy { get; set; }
        public Guid? ClaimId { get; set; }
        public virtual Claim? Claim { get; set; }
        public string Category { get; set; } = string.Empty;
    }
}
