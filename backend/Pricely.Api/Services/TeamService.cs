using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Pricely.Infrastructure;
using Pricely.Core.Entities;
using Pricely.Api.Dtos;
using Pricely.Api.Models;

namespace Pricely.Api.Services;

/// <summary>
/// Back-office team management: the pending queue, invites, role changes and
/// removals. Every method here assumes the caller has already been checked as
/// an admin by the endpoint's policy — but it still re-checks the things that
/// a policy can't know, like "is this the last admin".
/// </summary>
public class TeamService
{
    private static readonly TimeSpan InviteLifetime = TimeSpan.FromDays(7);

    private readonly AppDbContext _db;
    private readonly IActivityLogger _activity;
    private readonly IEmailSender _email;
    private readonly ITokenService _tokens;

    public TeamService(
        AppDbContext db,
        IActivityLogger activity,
        IEmailSender email,
        ITokenService tokens)
    {
        _db = db;
        _activity = activity;
        _email = email;
        _tokens = tokens;
    }

    // ── Reading ──────────────────────────────────────────────────────────

    // Both of these materialise with ToListAsync BEFORE building the DTO, so
    // ToWire() runs as C#. Projected straight into the query, EF would turn
    // it into a SQL cast and silently produce a different spelling.
    public async Task<List<TeamMemberView>> GetMembersAsync(CancellationToken ct)
    {
        var members = await _db.Users
            .Where(u => u.Role != UserRole.User)
            .OrderBy(u => u.Name)
            .Select(u => new { u.Id, u.Name, u.Email, u.Role, u.IsActive, u.CreatedAt })
            .ToListAsync(ct);

        return members
            .Select(u => new TeamMemberView(u.Id, u.Name, u.Email, u.Role.ToWire(), u.IsActive, u.CreatedAt))
            .ToList();
    }

    public async Task<List<TeamRequestView>> GetRequestsAsync(TeamRequestStatus? status, CancellationToken ct)
    {
        var query = _db.TeamRequests.AsQueryable();
        if (status is not null)
            query = query.Where(t => t.Status == status);

        var requests = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id, t.Email, t.Name, t.RequestedRole,
                t.Type, t.Status, t.CreatedAt, t.ExpiresAt
            })
            .ToListAsync(ct);

        return requests
            .Select(t => new TeamRequestView(
                t.Id, t.Email, t.Name, t.RequestedRole.ToWire(),
                t.Type.ToWire(), t.Status.ToWire(),
                t.CreatedAt, t.ExpiresAt))
            .ToList();
    }

    public async Task<List<ActivityLogDto>> GetActivityAsync(int limit, CancellationToken ct) =>
        await _db.ActivityLog
            .Include(a => a.Actor)
            .OrderByDescending(a => a.CreatedAt)
            .Take(Math.Clamp(limit, 1, 200))
            .Select(a => new ActivityLogDto(
                a.Id, a.Actor.Name, a.Action, a.TargetType, a.TargetId, a.CreatedAt))
            .ToListAsync(ct);

    // ── Approving / rejecting the pending queue ──────────────────────────

    public async Task<TeamMemberView> ApproveAsync(long actorId, long requestId, CancellationToken ct)
    {
        var request = await _db.TeamRequests
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == requestId, ct)
            ?? throw new AuthException("not_found", "That request no longer exists.", StatusCodes.Status404NotFound);

        if (request.Status != TeamRequestStatus.Pending)
            throw new AuthException("already_reviewed", $"This request was already {request.Status.ToWire()}.");

        // Approving your own request would defeat the entire gate — a person
        // who somehow reached this endpoint could promote themselves.
        if (request.UserId == actorId)
            throw new AuthException("self_approval", "You can't approve your own access request.", StatusCodes.Status403Forbidden);

        var user = request.User
            ?? throw new AuthException("not_found", "The account for this request no longer exists.", StatusCodes.Status404NotFound);

        user.Role = request.RequestedRole;
        user.IsActive = true;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        request.Status = TeamRequestStatus.Approved;
        request.ReviewedBy = actorId;
        request.ReviewedAt = DateTimeOffset.UtcNow;

        _activity.Record(ActivityActions.ApproveTeamRequest, "team_request", request.Id,
            new { request.Email, role = request.RequestedRole.ToWire() });

        await _db.SaveChangesAsync(ct);

        return new TeamMemberView(user.Id, user.Name, user.Email, user.Role.ToWire(), user.IsActive, user.CreatedAt);
    }

    public async Task RejectAsync(long actorId, long requestId, CancellationToken ct)
    {
        var request = await _db.TeamRequests
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == requestId, ct)
            ?? throw new AuthException("not_found", "That request no longer exists.", StatusCodes.Status404NotFound);

        if (request.Status != TeamRequestStatus.Pending)
            throw new AuthException("already_reviewed", $"This request was already {request.Status.ToWire()}.");

        request.Status = TeamRequestStatus.Rejected;
        request.ReviewedBy = actorId;
        request.ReviewedAt = DateTimeOffset.UtcNow;

        // The account stays inactive rather than being deleted, so the same
        // person can't immediately re-apply into a fresh pending row and the
        // rejection remains visible in the audit trail.
        if (request.User is { } user && user.Role != UserRole.User)
        {
            user.IsActive = false;
            user.UpdatedAt = DateTimeOffset.UtcNow;
        }

        _activity.Record(ActivityActions.RejectTeamRequest, "team_request", request.Id,
            new { request.Email });

        await _db.SaveChangesAsync(ct);
    }

    // ── Invites ──────────────────────────────────────────────────────────

    public async Task<TeamRequestView> InviteAsync(long actorId, InviteMemberInput req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var role = req.Role.ToUserRole();

        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existing is not null && existing.Role != UserRole.User)
            throw new AuthException("already_member", "That email is already on the team.");
        if (existing is not null)
            throw new AuthException("already_registered", "That email already has a shopper account. Change their role instead of inviting them.");

        var alreadyInvited = await _db.TeamRequests.AnyAsync(
            t => t.Email == email && t.Status == TeamRequestStatus.Pending, ct);
        if (alreadyInvited)
            throw new AuthException("already_invited", "That email already has an invite waiting.");

        // Raw token goes in the email; only its hash is stored, so reading the
        // database gives you nothing you could accept an invite with.
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        var request = new TeamRequest
        {
            Email = email,
            RequestedRole = role,
            Type = TeamRequestType.Invite,
            Status = TeamRequestStatus.Pending,
            InvitedBy = actorId,
            InviteToken = _tokens.HashRefreshToken(rawToken),
            ExpiresAt = DateTimeOffset.UtcNow.Add(InviteLifetime)
        };

        _db.TeamRequests.Add(request);
        _activity.Record(ActivityActions.SendInvite, "team_request", null,
            new { email, role = role.ToWire() });

        await _db.SaveChangesAsync(ct);
        await _email.SendTeamInviteAsync(email, rawToken, role.ToWire(), ct);

        return new TeamRequestView(
            request.Id, request.Email, request.Name, request.RequestedRole.ToWire(),
            request.Type.ToWire(), request.Status.ToWire(), request.CreatedAt, request.ExpiresAt);
    }

    public async Task RevokeInviteAsync(long actorId, long requestId, CancellationToken ct)
    {
        var request = await _db.TeamRequests.FirstOrDefaultAsync(
            t => t.Id == requestId && t.Type == TeamRequestType.Invite, ct)
            ?? throw new AuthException("not_found", "That invite no longer exists.", StatusCodes.Status404NotFound);

        if (request.Status != TeamRequestStatus.Pending)
            throw new AuthException("already_reviewed", "That invite has already been used or cancelled.");

        request.Status = TeamRequestStatus.Rejected;
        request.ReviewedBy = actorId;
        request.ReviewedAt = DateTimeOffset.UtcNow;
        request.InviteToken = null;      // the emailed link stops working immediately

        _activity.Record(ActivityActions.RevokeInvite, "team_request", request.Id,
            new { request.Email });

        await _db.SaveChangesAsync(ct);
    }

    // ── Changing / removing members ──────────────────────────────────────

    public async Task<TeamMemberView> ChangeRoleAsync(long actorId, long userId, RoleChangeInput req, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.Sessions)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("not_found", "That team member no longer exists.", StatusCodes.Status404NotFound);

        if (user.Role == UserRole.User)
            throw new AuthException("not_a_member", "That account is a shopper, not a team member.");

        var newRole = req.Role.ToUserRole();
        if (user.Role == newRole)
            return ToDto(user);

        // Demoting yourself, or removing the last admin, locks everyone out of
        // the back office with no way back in except direct database access.
        if (user.Id == actorId && newRole != UserRole.Admin)
            throw new AuthException("self_demotion", "You can't remove your own admin access — ask another admin to do it.", StatusCodes.Status403Forbidden);

        if (user.Role == UserRole.Admin && newRole != UserRole.Admin)
            await GuardLastAdminAsync(user.Id, ct);

        var previous = user.Role;
        user.Role = newRole;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        // Their existing tokens still carry the old role until they expire, so
        // the sessions are revoked to force a fresh login with the new one.
        RevokeSessions(user);

        _activity.Record(ActivityActions.ChangeRole, "user", user.Id,
            new { user.Email, from = previous.ToWire(), to = newRole.ToWire() });

        await _db.SaveChangesAsync(ct);
        return ToDto(user);
    }

    public async Task RemoveMemberAsync(long actorId, long userId, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.Sessions)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("not_found", "That team member no longer exists.", StatusCodes.Status404NotFound);

        if (user.Role == UserRole.User)
            throw new AuthException("not_a_member", "That account is a shopper, not a team member.");

        if (user.Id == actorId)
            throw new AuthException("self_removal", "You can't remove yourself from the team.", StatusCodes.Status403Forbidden);

        if (user.Role == UserRole.Admin)
            await GuardLastAdminAsync(user.Id, ct);

        // Demoted to shopper and deactivated rather than deleted: activity_log
        // rows reference this user, and deleting would either break that audit
        // trail or cascade it away.
        user.Role = UserRole.User;
        user.IsActive = false;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        RevokeSessions(user);

        _activity.Record(ActivityActions.RemoveMember, "user", user.Id, new { user.Email });

        await _db.SaveChangesAsync(ct);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /// <summary>
    /// Backstop against there being no admin left.
    ///
    /// In normal single-request flow this never actually fires: the caller must
    /// themselves be an active admin to reach these endpoints, and the
    /// self-demotion / self-removal guards run first, so the count below always
    /// still includes the caller. What genuinely prevents lockout is those two
    /// self-guards — this is defence in depth for inconsistent state.
    ///
    /// It also does NOT close the concurrent case: two admins demoting each
    /// other at the same instant would each see the other still counted and
    /// both succeed. Closing that needs serialisable isolation or a row lock;
    /// noted in backend/README.md rather than silently assumed handled.
    /// </summary>
    private async Task GuardLastAdminAsync(long excludingUserId, CancellationToken ct)
    {
        var remaining = await _db.Users.CountAsync(
            u => u.Role == UserRole.Admin && u.IsActive && u.Id != excludingUserId, ct);

        if (remaining == 0)
            throw new AuthException(
                "last_admin",
                "This is the only active admin. Promote someone else first, or the back office becomes unreachable.",
                StatusCodes.Status409Conflict);
    }

    private static void RevokeSessions(User user)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var session in user.Sessions.Where(s => s.RevokedAt is null))
            session.RevokedAt = now;
    }

    private static TeamMemberView ToDto(User u) =>
        new(u.Id, u.Name, u.Email, u.Role.ToWire(), u.IsActive, u.CreatedAt);
}
