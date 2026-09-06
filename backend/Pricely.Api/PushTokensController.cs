using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

/// <summary>
/// Where the app tells the server how to reach this device.
///
/// Called after signing in, and again whenever the operating system issues a
/// new token. Logging out removes it, so a shared phone does not keep
/// delivering one person's alerts to whoever uses it next.
/// </summary>
[ApiController]
[Route("api/v1/me/push-token")]
[Authorize]
public class PushTokensController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _me;

    public PushTokensController(AppDbContext db, ICurrentUser me)
    {
        _db = db;
        _me = me;
    }

    public record RegisterPushTokenRequest(string Token, string? Platform);

    /// <summary>Registers this device, or moves it to the signed-in user.</summary>
    [HttpPost]
    public async Task<IActionResult> Register(RegisterPushTokenRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
            return BadRequest(new { title = "A push token is required" });

        var existing = await _db.PushTokens.FirstOrDefaultAsync(t => t.Token == req.Token, ct);

        if (existing is null)
        {
            _db.PushTokens.Add(new PushToken
            {
                UserId = _me.Id,
                Token = req.Token.Trim(),
                Platform = req.Platform,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
        else
        {
            // The same device, now signed in as someone else. Reassign rather
            // than insert: the token is unique, and the previous owner should
            // stop receiving anything here.
            existing.UserId = _me.Id;
            existing.Platform = req.Platform ?? existing.Platform;
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Stops notifications to this device. Called on logout.</summary>
    [HttpDelete]
    public async Task<IActionResult> Unregister([FromQuery] string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { title = "A push token is required" });

        // Scoped to the caller so nobody can silence someone else's device by
        // guessing a token.
        await _db.PushTokens
            .Where(t => t.Token == token && t.UserId == _me.Id)
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }
}
