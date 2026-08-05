namespace Pricely.Api.Authorization;

/// <summary>
/// Policy names, in one place so a typo in an [Authorize] attribute is a
/// compile error rather than a silently unprotected endpoint.
/// </summary>
public static class Policies
{
    /// <summary>Any active back-office role: Admin, Support or Read-only.</summary>
    public const string BackOffice = nameof(BackOffice);

    /// <summary>Admin and Support — the roles that can see the team screens.</summary>
    public const string TeamView = nameof(TeamView);

    /// <summary>Admin only: approving, inviting, changing roles, removing people.</summary>
    public const string AdminOnly = nameof(AdminOnly);
}
