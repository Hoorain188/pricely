using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Authorization;
using Pricely.Api.Services;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

/// <summary>
/// Turning two-factor authentication on and off.
///
/// Signing in with it is not here — that stays on /api/auth/login, which
/// takes the code alongside the password, so there is only ever one way to
/// obtain a session.
/// </summary>
[ApiController]
[Route("api/v1/me/2fa")]
[Authorize]
public class TwoFactorController : ControllerBase
{
    private readonly ITwoFactorService _twoFactor;
    private readonly ICurrentUser _me;
    private readonly AppDbContext _db;

    public TwoFactorController(ITwoFactorService twoFactor, ICurrentUser me, AppDbContext db)
    {
        _twoFactor = twoFactor;
        _me = me;
        _db = db;
    }

    public record StatusDto(bool Enabled, int BackupCodesRemaining);
    public record SetupDto(string Secret, string OtpAuthUri);
    public record CodeRequest(string Code);
    public record ConfirmDto(List<string> BackupCodes);

    /// <summary>Whether 2FA is on, and how many recovery codes are left.</summary>
    [HttpGet]
    public async Task<ActionResult<StatusDto>> Status(CancellationToken ct)
    {
        var enabled = await _db.Users
            .Where(u => u.Id == _me.Id)
            .Select(u => u.TotpEnabled)
            .FirstOrDefaultAsync(ct);

        return Ok(new StatusDto(enabled, await _twoFactor.RemainingBackupCodesAsync(_me.Id, ct)));
    }

    /// <summary>
    /// Starts setup and returns the secret plus the otpauth:// URI to render
    /// as a QR code. 2FA is not on yet — Confirm does that.
    /// </summary>
    [HttpPost("setup")]
    public async Task<ActionResult<SetupDto>> Setup(CancellationToken ct)
    {
        var (secret, uri) = await _twoFactor.BeginSetupAsync(_me.Id, ct);
        return Ok(new SetupDto(secret, uri));
    }

    /// <summary>
    /// Confirms the first code, switches 2FA on, and returns the recovery
    /// codes. They are shown once and never again — the server keeps only
    /// their hashes.
    /// </summary>
    [HttpPost("confirm")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<ConfirmDto>> Confirm(CodeRequest req, CancellationToken ct)
    {
        var codes = await _twoFactor.ConfirmSetupAsync(_me.Id, req.Code, ct);
        return Ok(new ConfirmDto(codes));
    }

    /// <summary>
    /// Turns 2FA off. Requires a current code, so someone who walks up to an
    /// unlocked phone cannot quietly remove it.
    /// </summary>
    [HttpPost("disable")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<IActionResult> Disable(CodeRequest req, CancellationToken ct)
    {
        if (!await _twoFactor.VerifyAsync(_me.Id, req.Code, ct))
            throw new AuthException("invalid_code", "That code isn't right.", StatusCodes.Status401Unauthorized);

        await _twoFactor.DisableAsync(_me.Id, ct);
        return NoContent();
    }

    /// <summary>
    /// Issues a fresh set of recovery codes and voids the old ones — for when
    /// the printout is lost, or most of them have been spent.
    /// </summary>
    [HttpPost("backup-codes")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<ConfirmDto>> RegenerateBackupCodes(CodeRequest req, CancellationToken ct)
    {
        if (!await _twoFactor.VerifyAsync(_me.Id, req.Code, ct))
            throw new AuthException("invalid_code", "That code isn't right.", StatusCodes.Status401Unauthorized);

        var codes = await _twoFactor.RegenerateBackupCodesAsync(_me.Id, ct);
        return Ok(new ConfirmDto(codes));
    }
}
