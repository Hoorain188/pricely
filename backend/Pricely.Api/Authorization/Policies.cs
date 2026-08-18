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

    /// <summary>
    /// Admin and Support: back-office actions that change something —
    /// merging duplicates, re-running a scraper. Same two roles as
    /// TeamView, kept separate because they answer different questions,
    /// and one may be narrowed later without dragging the other with it.
    /// </summary>
    public const string BackOfficeWrite = nameof(BackOfficeWrite);

    /// <summary>Admin only: approving, inviting, changing roles, removing people.</summary>
    public const string AdminOnly = nameof(AdminOnly);
}
