namespace Pricely.Api.Models;

/// <summary>
/// One row per logged-in device. Backs the admin "Active sessions" screen,
/// and is what makes a refresh token revocable — deleting/revoking the row
/// logs that device out even though its JWT hasn't expired yet.
/// </summary>
public class Session
{
    public long Id { get; set; }
    public long UserId { get; set; }

    /// <summary>SHA-256 of the refresh token. The raw token only ever lives on the device.</summary>
    public string RefreshTokenHash { get; set; } = null!;

    public string? DeviceName { get; set; }
    public string? IpAddress { get; set; }

    public DateTimeOffset LastActiveAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }

    public User User { get; set; } = null!;
}
