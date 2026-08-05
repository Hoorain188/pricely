using System.Text.Json;

namespace Pricely.Api.Models;

/// <summary>
/// Who did what, for accountability once more than one person has admin.
/// Written on every state-changing back-office action; never edited or
/// deleted, so it stays a trustworthy record.
/// </summary>
public class ActivityLog
{
    public long Id { get; set; }

    /// <summary>The user who performed the action.</summary>
    public long ActorId { get; set; }

    /// <summary>Stable verb, e.g. "approve_team_request", "change_role".</summary>
    public string Action { get; set; } = null!;

    /// <summary>What was acted on, e.g. "team_request", "user".</summary>
    public string? TargetType { get; set; }
    public long? TargetId { get; set; }

    /// <summary>Free-form context, e.g. the before/after role.</summary>
    public JsonDocument? Details { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User Actor { get; set; } = null!;
}

public static class ActivityActions
{
    public const string ApproveTeamRequest = "approve_team_request";
    public const string RejectTeamRequest = "reject_team_request";
    public const string SendInvite = "send_invite";
    public const string RevokeInvite = "revoke_invite";
    public const string AcceptInvite = "accept_invite";
    public const string ChangeRole = "change_role";
    public const string RemoveMember = "remove_member";
}
