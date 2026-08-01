namespace Pricely.Api.Models;

/// <summary>
/// A 6-digit code emailed during signup or password reset. Keyed by email
/// rather than user id, because during signup the code is issued before the
/// account is confirmed to exist.
/// </summary>
public class VerificationCode
{
    public long Id { get; set; }
    public string Email { get; set; } = null!;

    /// <summary>BCrypt hash of the 6 digits — the plain code only exists in the email.</summary>
    public string CodeHash { get; set; } = null!;

    public VerificationPurpose Purpose { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsUsable(DateTimeOffset now) => UsedAt is null && ExpiresAt > now;
}
