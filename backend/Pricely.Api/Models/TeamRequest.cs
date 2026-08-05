namespace Pricely.Api.Models;

/// <summary>
/// Back-office access waiting on an admin's decision. Covers both directions:
/// SelfSignup (someone picked ADMIN on the signup screen and must be approved)
/// and Invite (an existing admin invited them, which joins them directly).
/// </summary>
public class TeamRequest
{
    public long Id { get; set; }

    public string Email { get; set; } = null!;
    public string? Name { get; set; }

    public UserRole RequestedRole { get; set; }
    public TeamRequestType Type { get; set; }
    public TeamRequestStatus Status { get; set; } = TeamRequestStatus.Pending;

    /// <summary>The not-yet-active account this request would unlock. Null for invites to people with no account yet.</summary>
    public long? UserId { get; set; }

    public long? InvitedBy { get; set; }
    public long? ReviewedBy { get; set; }

    /// <summary>
    /// SHA-256 hash of the invite token — the raw token exists only in the
    /// email. Stored hashed so a database leak can't be used to accept invites.
    /// </summary>
    public string? InviteToken { get; set; }

    /// <summary>Invites expire; a link left in an old inbox shouldn't work forever.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReviewedAt { get; set; }

    public User? User { get; set; }
}
