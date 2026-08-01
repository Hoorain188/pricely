using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Dtos;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/v1/admin/me")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _me;

    public SettingsController(AppDbContext db, ICurrentUser me)
    {
        _db = db;
        _me = me;
    }

    /// <summary>
    /// Notification toggles for the signed-in admin. These belong on the
    /// server, not in AsyncStorage — the backend is what sends the emails,
    /// so it has to know the preference.
    /// </summary>
    [HttpGet("notifications")]
    public async Task<ActionResult<NotificationPrefsDto>> Get(CancellationToken ct)
    {
        var prefs = await _db.UserNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _me.Id, ct);

        // No row yet means defaults, not an error.
        return Ok(new NotificationPrefsDto(
            prefs?.NewReports ?? true,
            prefs?.SyncFailures ?? true,
            prefs?.WeeklySummaryEmail ?? false));
    }

    [HttpPatch("notifications")]
    public async Task<ActionResult<NotificationPrefsDto>> Update(
        NotificationPrefsDto req, CancellationToken ct)
    {
        if (_me.Id <= 0) return Unauthorized();

        var prefs = await _db.UserNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _me.Id, ct);

        if (prefs is null)
        {
            prefs = new UserNotificationSettings { UserId = _me.Id };
            _db.UserNotificationSettings.Add(prefs);
        }

        prefs.NewReports         = req.NewReports;
        prefs.SyncFailures       = req.SyncFailures;
        prefs.WeeklySummaryEmail = req.WeeklySummaryEmail;

        await _db.SaveChangesAsync(ct);

        return Ok(new NotificationPrefsDto(
            prefs.NewReports, prefs.SyncFailures, prefs.WeeklySummaryEmail));
    }
}