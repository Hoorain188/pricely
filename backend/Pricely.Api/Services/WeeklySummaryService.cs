using Microsoft.EntityFrameworkCore;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

/// <summary>
/// The weekly back-office digest.
///
/// Two toggles on the admin settings screen were saved and never read by
/// anything: weekly_summary_email and new_reports. This is what reads them —
/// once a week it gathers the numbers and sends them, by email to those who
/// asked for the email, and as a notification to those who asked to be told
/// when a new report is ready.
/// </summary>
public class WeeklySummaryService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly IPushSender _push;
    private readonly ILogger<WeeklySummaryService> _logger;

    public WeeklySummaryService(
        AppDbContext db, IEmailSender email, IPushSender push, ILogger<WeeklySummaryService> logger)
    {
        _db = db;
        _email = email;
        _push = push;
        _logger = logger;
    }

    public async Task SendWeeklySummaryAsync()
    {
        var since = DateTimeOffset.UtcNow.AddDays(-7);

        var newUsers = await _db.Users.CountAsync(u => u.CreatedAt >= since);
        var searches = await _db.SearchQueries.CountAsync(q => q.CreatedAt >= since);
        var clicks = await _db.StoreClicks.CountAsync(c => c.CreatedAt >= since);
        var listings = await _db.StoreListings.CountAsync();
        var alertsFired = await _db.PriceAlerts.CountAsync(a => a.TriggeredAt >= since);
        var failedRuns = await _db.ScraperRuns.CountAsync(
            r => r.StartedAt >= since && r.Status == ScraperRunStatus.Fail);

        var summary =
            $"{newUsers} new users, {searches} searches, {clicks} store clicks, "
            + $"{alertsFired} price alerts fired, {listings:N0} listings tracked"
            + (failedRuns > 0 ? $", {failedRuns} failed scraper runs" : "");

        // Back-office only, and only active accounts — a removed colleague
        // should stop receiving the week's numbers.
        var staff = _db.Users.Where(u => u.IsActive && u.Role != UserRole.User);

        var emailWanted = await staff
            .Join(_db.UserNotificationSettings.Where(s => s.WeeklySummaryEmail),
                  u => u.Id, s => s.UserId, (u, s) => u.Email)
            .ToListAsync();

        var pushWanted = await staff
            .Join(_db.UserNotificationSettings.Where(s => s.NewReports),
                  u => u.Id, s => s.UserId, (u, s) => u.Id)
            .ToListAsync();

        foreach (var address in emailWanted)
        {
            try
            {
                await _email.SendNoticeAsync(
                    address, "Pricely weekly summary", "This week on Pricely", summary);
            }
            catch (Exception ex)
            {
                // One undeliverable address must not stop the rest.
                _logger.LogWarning(ex, "Weekly summary email to {Email} failed", address);
            }
        }

        if (pushWanted.Count > 0)
        {
            await _push.SendToUsersAsync(
                pushWanted, "This week on Pricely", summary, new { type = "weekly_summary" });
        }

        _logger.LogInformation(
            "Weekly summary sent to {Emails} by email and {Push} by notification: {Summary}",
            emailWanted.Count, pushWanted.Count, summary);
    }
}
