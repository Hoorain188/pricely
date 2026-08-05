using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pricely.Api.Authorization;
using Pricely.Api.Dtos;
using Pricely.Api.Models;
using Pricely.Api.Services;

namespace Pricely.Api.Controllers;

/// <summary>
/// Back-office team management.
///
/// Two policies are in play, and the split is deliberate:
///   TeamView  — Admin + Support may look (Read-only can't see the Users tab).
///   AdminOnly — only Admin may approve, reject, invite, change a role or remove.
///
/// Both re-check the database rather than trusting the token's role claim.
/// </summary>
[ApiController]
[Route("api/admin/team")]
[Authorize]
public class TeamController : ControllerBase
{
    private readonly TeamService _team;

    public TeamController(TeamService team) => _team = team;

    // ── Reading ──────────────────────────────────────────────────────────

    [HttpGet("members")]
    [Authorize(Policy = Policies.TeamView)]
    public async Task<ActionResult<List<TeamMemberDto>>> Members(CancellationToken ct)
        => Ok(await _team.GetMembersAsync(ct));

    /// <summary>Pending queue by default; pass ?status=Approved or Rejected for history.</summary>
    [HttpGet("requests")]
    [Authorize(Policy = Policies.TeamView)]
    public async Task<ActionResult<List<TeamRequestDto>>> Requests(
        [FromQuery] TeamRequestStatus? status, CancellationToken ct)
        => Ok(await _team.GetRequestsAsync(status ?? TeamRequestStatus.Pending, ct));

    [HttpGet("activity")]
    [Authorize(Policy = Policies.TeamView)]
    public async Task<ActionResult<List<ActivityLogDto>>> Activity(
        [FromQuery] int limit = 50, CancellationToken ct = default)
        => Ok(await _team.GetActivityAsync(limit, ct));

    // ── Approving / rejecting ────────────────────────────────────────────

    [HttpPost("requests/{id:long}/approve")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<TeamMemberDto>> Approve(long id, CancellationToken ct)
        => Ok(await _team.ApproveAsync(CurrentUserId, id, ct));

    [HttpPost("requests/{id:long}/reject")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Reject(long id, CancellationToken ct)
    {
        await _team.RejectAsync(CurrentUserId, id, ct);
        return NoContent();
    }

    // ── Invites ──────────────────────────────────────────────────────────

    [HttpPost("invites")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<TeamRequestDto>> Invite(InviteMemberRequest req, CancellationToken ct)
        => Ok(await _team.InviteAsync(CurrentUserId, req, ct));

    [HttpDelete("invites/{id:long}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> RevokeInvite(long id, CancellationToken ct)
    {
        await _team.RevokeInviteAsync(CurrentUserId, id, ct);
        return NoContent();
    }

    // ── Members ──────────────────────────────────────────────────────────

    [HttpPatch("members/{id:long}/role")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<ActionResult<TeamMemberDto>> ChangeRole(long id, ChangeRoleRequest req, CancellationToken ct)
        => Ok(await _team.ChangeRoleAsync(CurrentUserId, id, req, ct));

    [HttpDelete("members/{id:long}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> RemoveMember(long id, CancellationToken ct)
    {
        await _team.RemoveMemberAsync(CurrentUserId, id, ct);
        return NoContent();
    }

    private long CurrentUserId =>
        long.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new AuthException("unauthorized", "Not signed in.", StatusCodes.Status401Unauthorized));
}
