namespace Pegasus.Core.Models;

public sealed record UserProfile
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PasswordHash { get; init; } = string.Empty;
    public List<string> Roles { get; init; } = new();
    public List<string> Permissions { get; init; } = new();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; init; }
    public bool IsActive { get; init; } = true;
}
