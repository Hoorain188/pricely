using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Dtos;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/v1/admin/team")]
// TODO: [Authorize(Roles = "Admin")] on every write action here.
public class TeamController : ControllerBase
{
    private static readonly UserRole[] TeamRoles =
        [UserRole.Admin, UserRole.Support, UserRole.ReadOnly];

    private readonly AppDbContext _db;
    private readonly IActivityLogger _log;
    private readonly ICurrentUser _me;

    public TeamController(AppDbContext db, IActivityLogger log, ICurrentUser me)
    {
        _db  = db;
        _log = log;
        _me  = me;
    }

    /// <summary>Admin team members. Customers (role = user) are excluded.</summary>
    [HttpGet]
    public async Task<ActionResult<TeamResponse>> List(CancellationToken ct)
    {
        var members = await _db.Users
            .Where(u => TeamRoles.Contains(u.Role))
            .OrderBy(u => u.Name)
            .ToListAsync(ct);

        var items = members
            .Select(u => new TeamMemberDto(
                u.Id, u.Name, u.Email, u.Role.ToString().ToLowerInvariant(),
                u.Location, u.AvatarInitial))
            .ToList();

        return Ok(new TeamResponse(items.Count, items));
    }

    /// <summary>
    /// Inbound access requests — people who asked for admin access themselves.
    /// The activity log in the mock references approving and rejecting these,
    /// and team_requests.type = self_signup is where they live.
    /// </summary>
    [HttpGet("requests")]
    public async Task<ActionResult<IReadOnlyList<TeamRequestDto>>> Requests(CancellationToken ct)
    {
        var rows = await _db.TeamRequests
            .Where(t => t.Type == TeamRequestType.SelfSignup && t.Status == TeamRequestStatus.Pending)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync(ct);

        return Ok(rows.Select(t => new TeamRequestDto(
            t.Id, t.Email, t.Name,
            t.RequestedRole.ToString().ToLowerInvariant(),
            t.CreatedAt)).ToList());
    }

    /// <summary>Approve an access request. Issues a token so they can set a password.</summary>
    [HttpPost("requests/{requestId:long}/approve")]
    public async Task<IActionResult> ApproveRequest(long requestId, CancellationToken ct)
    {
        var req = await _db.TeamRequests.FirstOrDefaultAsync(t => t.Id == requestId, ct);
        if (req is null) return NotFound();

        if (req.Status != TeamRequestStatus.Pending)
            return Conflict(new { title = "This request has already been reviewed" });

        req.Status      = TeamRequestStatus.Approved;
        req.ReviewedBy  = _me.Id;
        req.ReviewedAt  = DateTimeOffset.UtcNow;
        req.InviteToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

        _log.Record("team.request_approved", "team_request", requestId,
            new { email = req.Email, name = req.Name });

        await _db.SaveChangesAsync(ct);

        // TODO: email the token so they can set a password.
        return NoContent();
    }

    /// <summary>Reject an access request.</summary>
    [HttpPost("requests/{requestId:long}/reject")]
    public async Task<IActionResult> RejectRequest(long requestId, CancellationToken ct)
    {
        var req = await _db.TeamRequests.FirstOrDefaultAsync(t => t.Id == requestId, ct);
        if (req is null) return NotFound();

        if (req.Status != TeamRequestStatus.Pending)
            return Conflict(new { title = "This request has already been reviewed" });

        req.Status     = TeamRequestStatus.Rejected;
        req.ReviewedBy = _me.Id;
        req.ReviewedAt = DateTimeOffset.UtcNow;

        _log.Record("team.request_rejected", "team_request", requestId,
            new { email = req.Email, name = req.Name });

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Invite someone by email. They get a link to set their password.</summary>
    [HttpPost("invites")]
    public async Task<ActionResult<InviteResponse>> Invite(InviteRequest req, CancellationToken ct)
    {
        if (!TryParseTeamRole(req.Role, out var role))
            return BadRequest(new { title = $"'{req.Role}' is not a valid team role" });

        var email = req.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            return Conflict(new { title = "That email already has an account" });

        if (await _db.TeamRequests.AnyAsync(
                t => t.Email == email && t.Status == TeamRequestStatus.Pending, ct))
            return Conflict(new { title = "An invite is already pending for that email" });

        var invite = new TeamRequest
        {
            Email         = email,
            RequestedRole = role,
            Type          = TeamRequestType.Invite,
            Status        = TeamRequestStatus.Pending,
            InvitedBy     = _me.Id,
            InviteToken   = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
            CreatedAt     = DateTimeOffset.UtcNow
        };

        _db.TeamRequests.Add(invite);
        _log.Record("team.invited", "team_request", null,
            new { email, role = role.ToString().ToLowerInvariant() });

        await _db.SaveChangesAsync(ct);

        // TODO: send the email containing InviteToken. Until an email service
        // is wired up the invite exists but nobody is told about it.
        return Ok(new InviteResponse(
            invite.Id, invite.Email,
            invite.RequestedRole.ToString().ToLowerInvariant(),
            invite.CreatedAt));
    }

    /// <summary>Change a member's role.</summary>
    [HttpPatch("{userId:long}/role")]
    public async Task<ActionResult<TeamMemberDto>> ChangeRole(
        long userId, ChangeRoleRequest req, CancellationToken ct)
    {
        if (!TryParseTeamRole(req.Role, out var role))
            return BadRequest(new { title = $"'{req.Role}' is not a valid team role" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !TeamRoles.Contains(user.Role)) return NotFound();

        var guard = await GuardAsync(user, ct);
        if (guard is not null) return guard;

        var oldRole = user.Role;
        user.Role      = role;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        _log.Record("team.role_changed", "user", userId, new
        {
            name = user.Name,
            from = oldRole.ToString().ToLowerInvariant(),
            to   = role.ToString().ToLowerInvariant()
        });

        await _db.SaveChangesAsync(ct);

        return Ok(new TeamMemberDto(
            user.Id, user.Name, user.Email,
            user.Role.ToString().ToLowerInvariant(),
            user.Location, user.AvatarInitial));
    }

    /// <summary>Remove a member from the admin team.</summary>
    [HttpDelete("{userId:long}")]
    public async Task<IActionResult> Remove(long userId, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !TeamRoles.Contains(user.Role)) return NotFound();

        var guard = await GuardAsync(user, ct);
        if (guard is not null) return guard;

        // Demote rather than delete: activity_log rows point at this user,
        // and deleting would either break those or erase the history.
        user.Role      = UserRole.User;
        user.IsActive  = false;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        _log.Record("team.removed", "user", userId, new { name = user.Name });
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }

    /// <summary>
    /// Accepts any casing the app sends: "admin", "Admin", "readonly", "ReadOnly".
    /// Rejects "user", since a customer is not a team role.
    /// </summary>
    private static bool TryParseTeamRole(string? value, out UserRole role)
    {
        role = default;
        return !string.IsNullOrWhiteSpace(value)
            && Enum.TryParse(value, ignoreCase: true, out role)
            && TeamRoles.Contains(role);
    }

    /// <summary>
    /// The two rules that stop the admin panel locking everyone out:
    /// nobody edits themselves, and the last Admin cannot be demoted or removed.
    /// The demo activity log shows "Removed Bilal from the team" performed by
    /// Bilal — exactly the situation this prevents.
    /// </summary>
    private async Task<ActionResult?> GuardAsync(User target, CancellationToken ct)
    {
        if (target.Id == _me.Id)
            return UnprocessableEntity(new { title = "You cannot change your own access" });

        if (target.Role == UserRole.Admin)
        {
            var admins = await _db.Users.CountAsync(
                u => u.Role == UserRole.Admin && u.IsActive, ct);

            if (admins <= 1)
                return UnprocessableEntity(new { title = "There must be at least one admin" });
        }

        return null;
    }
}