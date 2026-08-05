using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Data;
using Pricely.Api.Models;

namespace Pricely.Api.Authorization;

/// <summary>
/// Requires that the caller is still, right now, an active back-office user
/// holding one of <see cref="AllowedRoles"/>.
/// </summary>
public class ActiveBackOfficeRequirement : IAuthorizationRequirement
{
    public UserRole[] AllowedRoles { get; }

    public ActiveBackOfficeRequirement(params UserRole[] allowedRoles) => AllowedRoles = allowedRoles;
}

/// <summary>
/// Re-reads the user's row instead of trusting the role baked into the token.
///
/// A JWT is a snapshot: if an admin demotes or deactivates someone, that
/// person's already-issued token keeps claiming the old role until it expires.
/// Revoking their sessions stops them refreshing, but not the token in hand.
/// Back-office endpoints are rare and sensitive enough to be worth one extra
/// read to close that window entirely.
/// </summary>
public class ActiveBackOfficeHandler : AuthorizationHandler<ActiveBackOfficeRequirement>
{
    private readonly PricelyDbContext _db;
    private readonly ILogger<ActiveBackOfficeHandler> _logger;

    public ActiveBackOfficeHandler(PricelyDbContext db, ILogger<ActiveBackOfficeHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ActiveBackOfficeRequirement requirement)
    {
        var idClaim = context.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!long.TryParse(idClaim, out var userId))
            return;   // no id on the token — leave unsatisfied, request is refused

        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.IsActive, u.Role })
            .FirstOrDefaultAsync();

        if (user is null || !user.IsActive)
        {
            _logger.LogWarning("Rejected back-office request from user {UserId}: missing or inactive", userId);
            return;
        }

        if (!requirement.AllowedRoles.Contains(user.Role))
        {
            _logger.LogWarning(
                "Rejected back-office request from user {UserId}: role {Role} not permitted here",
                userId, user.Role);
            return;
        }

        context.Succeed(requirement);
    }
}
