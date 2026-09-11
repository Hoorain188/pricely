using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pricely.Api.Authorization;
using Pricely.Api.Dtos;
using Pricely.Api.Services;
using Pricely.Core.Dtos;
using Pricely.Core.Entities;

namespace Pricely.Api.Controllers;

/// <summary>
/// Back-office team management.
///
/// Routes and response shapes are unchanged from the admin branch, because the
/// app's Manage Team Access screens already call them. What changed is what
/// sits behind them:
///
///   • Authorisation is now enforced. This file previously carried
///     "TODO: [Authorize(Roles = "Admin")] on every write action here" and no
///     attributes, so approving yourself as an admin needed no token at all.
///   • The work is delegated to TeamService, which carries the guards this
///     controller never had: you cannot approve your own request, demote
///     yourself, or remove yourself, and approving actually activates the
///     account and sets its role rather than only marking the row reviewed.
///   • Invites are hashed before storage and actually emailed. The previous
///     version stored the raw token and left "TODO: send the email".
///
/// Two policies, deliberately split:
///   TeamView  — Admin + Support may look (Read-only has no Users screen).
///   AdminOnly — only Admin may approve, reject, invite, change a role, remove.
///
/// Both re-read the database rather than trusting the token's role claim.
/// </summary>
[ApiController]
[Route("api/v1/admin/team")]
[Authorize]
public class TeamController : ControllerBase
{
    private readonly TeamService _team;

    public TeamController(TeamService team) => _team = team;

    // ── Reading ──────────────────────────────────────────────────────────

    /// <summary>Team members. Shape kept as TeamResponse for the existing screen.</summary>
    [HttpGet]
    [Authorize(Policy = Policies.TeamView)]
    public async Task<ActionResult<TeamResponse>> Members(CancellationToken ct)
    {
        var members = await _team.GetMembersAsync(ct);
        var items = members
            .Select(m => new TeamMemberDto(
                m.Id, m.Name, m.Email, m.Role,
                JobTitle: null,
                AvatarInitial: string.IsNullOrWhiteSpace(m.Name) ? "?" : m.Name.Trim()[..1].ToUpperInvariant()))
            .ToList();

        return Ok(new TeamResponse(items.Count, items));
    }

    [HttpGet("requests")]
    [Authorize(Policy = Policies.TeamView)]
    public async Task<ActionResult<IReadOnlyList<TeamRequestDto>>> Requests(
        [FromQuery] TeamRequestStatus? status, CancellationToken ct)
    {
        var requests = await _team.GetRequestsAsync(status ?? TeamRequestStatus.Pending, ct);
        return Ok(requests
            .Select(r => new TeamRequestDto(r.Id, r.Email, r.Name, r.RequestedRole, r.CreatedAt, r.Type, r.ExpiresAt))
            .ToList());
    }

    /// <summary>Who did what. Backs the Activity log screen.</summary>
    [HttpGet("activity")]
    [Authorize(Policy = Policies.TeamView)]
    public async Task<ActionResult<List<ActivityLogDto>>> Activity(
        [FromQuery] int limit = 50, CancellationToken ct = default)
        => Ok(await _team.GetActivityAsync(limit, ct));

    // ── Approving / rejecting ────────────────────────────────────────────

    [HttpPost("requests/{requestId:long}/approve")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> ApproveRequest(long requestId, CancellationToken ct)
    {
        await _team.ApproveAsync(CurrentUserId, requestId, ct);
        return NoContent();
    }

    [HttpPost("requests/{requestId:long}/reject")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> RejectRequest(long requestId, CancellationToken ct)
    {
        await _team.RejectAsync(CurrentUserId, requestId, ct);
        return NoContent();
    }

    // ── Invites ──────────────────────────────────────────────────────────

    [HttpPost("invites")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<InviteResponse>> Invite(InviteRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<AssignableRole>(req.Role, ignoreCase: true, out var role))
            throw new AuthException("validation_error", $"'{req.Role}' is not a valid team role.");

        var created = await _team.InviteAsync(CurrentUserId, new InviteMemberInput(req.Email, role), ct);
        return Ok(new InviteResponse(created.Id, created.Email, created.RequestedRole, created.CreatedAt, created.ShareToken));
    }

    /// <summary>Cancels a pending invite; the emailed link stops working immediately.</summary>
    [HttpDelete("invites/{requestId:long}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> RevokeInvite(long requestId, CancellationToken ct)
    {
        await _team.RevokeInviteAsync(CurrentUserId, requestId, ct);
        return NoContent();
    }

    // ── Members ──────────────────────────────────────────────────────────

    [HttpPatch("{userId:long}/role")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<TeamMemberDto>> ChangeRole(
        long userId, ChangeRoleRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<AssignableRole>(req.Role, ignoreCase: true, out var role))
            throw new AuthException("validation_error", $"'{req.Role}' is not a valid team role.");

        var m = await _team.ChangeRoleAsync(CurrentUserId, userId, new RoleChangeInput(role), ct);
        return Ok(new TeamMemberDto(
            m.Id, m.Name, m.Email, m.Role,
            JobTitle: null,
            AvatarInitial: string.IsNullOrWhiteSpace(m.Name) ? "?" : m.Name.Trim()[..1].ToUpperInvariant()));
    }

    [HttpDelete("{userId:long}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> RemoveMember(long userId, CancellationToken ct)
    {
        await _team.RemoveMemberAsync(CurrentUserId, userId, ct);
        return NoContent();
    }

    private long CurrentUserId =>
        long.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new AuthException("unauthorized", "Not signed in.", StatusCodes.Status401Unauthorized));
}
