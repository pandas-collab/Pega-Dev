using Microsoft.EntityFrameworkCore;
using Pegasus.Domain.Entities;

namespace Pegasus.Infrastructure.Data
{
    public class PegasusDbContext : DbContext
    {
        public PegasusDbContext(DbContextOptions<PegasusDbContext> options) : base(options)
        {
        }

        public DbSet<Policy> Policies { get; set; } = null!;
        public DbSet<Claim> Claims { get; set; } = null!;
        public DbSet<Document> Documents { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Policy entity
            modelBuilder.Entity<Policy>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PolicyNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PolicyHolderName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.PolicyHolderEmail).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PolicyType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PremiumAmount).HasPrecision(18, 2);
                entity.Property(e => e.Status).HasMaxLength(20);
            });

            // Configure Claim entity
            modelBuilder.Entity<Claim>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ClaimNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ClaimType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.ClaimAmount).HasPrecision(18, 2);
                entity.Property(e => e.Status).HasMaxLength(20);
                entity.Property(e => e.AssignedTo).HasMaxLength(100);

                entity.HasOne(e => e.Policy)
                      .WithMany(p => p.Claims)
                      .HasForeignKey(e => e.PolicyId);
            });

            // Configure Document entity
            modelBuilder.Entity<Document>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.FilePath).IsRequired().HasMaxLength(500);
                entity.Property(e => e.FileType).HasMaxLength(50);
                entity.Property(e => e.Category).HasMaxLength(50);

                entity.HasOne(e => e.Policy)
                      .WithMany()
                      .HasForeignKey(e => e.PolicyId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Claim)
                      .WithMany()
                      .HasForeignKey(e => e.ClaimId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
