namespace Pricely.Api.Models;

/// <summary>
/// Stable verbs written to activity_log. Constants rather than loose strings
/// so a typo is a compile error instead of an audit row nobody can query.
/// </summary>
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
