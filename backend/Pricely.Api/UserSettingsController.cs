using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

/// <summary>
/// A shopper's own notification preferences.
///
/// Separate from SettingsController, which sits under /api/v1/admin/me behind
/// the back-office policy and covers scraper and report toggles. Those are
/// not a shopper's concern, and a shopper cannot reach that route at all —
/// which is why the customer settings screen had nowhere to save to, and its
/// switches did nothing.
/// </summary>
[ApiController]
[Route("api/v1/me/notifications")]
[Authorize]
public class UserSettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _me;

    public UserSettingsController(AppDbContext db, ICurrentUser me)
    {
        _db = db;
        _me = me;
    }

    public record UserNotificationPrefsDto(bool PriceAlertsPush, bool PriceAlertsEmail);

    /// <summary>
    /// No row means the screen has never been opened. That is reported as both
    /// enabled, matching the column defaults — someone who set a price alert
    /// asked to be told about it, so silence has to be chosen deliberately.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<UserNotificationPrefsDto>> Get(CancellationToken ct)
    {
        var prefs = await _db.UserNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _me.Id, ct);

        return Ok(new UserNotificationPrefsDto(
            prefs?.PriceAlertsPush ?? true,
            prefs?.PriceAlertsEmail ?? true));
    }

    [HttpPatch]
    public async Task<ActionResult<UserNotificationPrefsDto>> Update(
        UserNotificationPrefsDto req, CancellationToken ct)
    {
        if (_me.Id <= 0) return Unauthorized();

        var prefs = await _db.UserNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _me.Id, ct);

        if (prefs is null)
        {
            // Created on first change. The back-office fields keep their own
            // defaults; this endpoint deliberately does not touch them, so a
            // shopper saving here cannot alter an admin's toggles.
            prefs = new UserNotificationSettings { UserId = _me.Id };
            _db.UserNotificationSettings.Add(prefs);
        }

        prefs.PriceAlertsPush  = req.PriceAlertsPush;
        prefs.PriceAlertsEmail = req.PriceAlertsEmail;

        await _db.SaveChangesAsync(ct);

        return Ok(new UserNotificationPrefsDto(prefs.PriceAlertsPush, prefs.PriceAlertsEmail));
    }
}
