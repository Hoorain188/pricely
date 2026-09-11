using Microsoft.EntityFrameworkCore;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

/// <summary>
/// The part that makes a price alert mean something.
///
/// Runs after each scrape, finds the alerts whose watched price has fallen to
/// the target, marks them triggered and notifies the shopper. Marking happens
/// in the same save as nothing else, so the same drop cannot be announced
/// twice on the next run.
/// </summary>
public interface IPriceAlertChecker
{
    /// <summary>Checks alerts on one store's listings. Returns how many fired.</summary>
    Task<int> CheckStoreAsync(long storeId, CancellationToken ct = default);
}

public class PriceAlertChecker : IPriceAlertChecker
{
    private readonly AppDbContext _db;
    private readonly IPushSender _push;
    private readonly IEmailSender _email;
    private readonly ILogger<PriceAlertChecker> _logger;

    public PriceAlertChecker(
        AppDbContext db, IPushSender push, IEmailSender email, ILogger<PriceAlertChecker> logger)
    {
        _db = db;
        _push = push;
        _email = email;
        _logger = logger;
    }

    public async Task<int> CheckStoreAsync(long storeId, CancellationToken ct = default)
    {
        // Only untriggered alerts, and only on this store's listings — a
        // Telemart scrape says nothing about a Mega.pk price.
        var due = await _db.PriceAlerts
            .Where(a => !a.IsTriggered
                     && a.IsActive
                     && a.StoreListingId != null
                     && a.StoreListing!.StoreId == storeId
                     && a.StoreListing.Price > 0
                     && a.StoreListing.Price <= a.TargetPrice)
            .Include(a => a.StoreListing).ThenInclude(l => l!.Store)
            .ToListAsync(ct);

        if (due.Count == 0) return 0;

        var now = DateTimeOffset.UtcNow;

        foreach (var alert in due)
        {
            alert.IsTriggered = true;
            alert.TriggeredAt = now;
        }

        // Saved before anything is sent. The reverse order risks telling
        // someone the price dropped and then failing to record it, which would
        // tell them again on the next scrape, and the one after that.
        await _db.SaveChangesAsync(ct);

        // Who wants what. A user with no settings row has never opened the
        // screen, which must not read as "wants nothing" — absent means both,
        // matching the column defaults.
        var userIds = due.Select(a => a.UserId).Distinct().ToList();

        var prefs = await _db.UserNotificationSettings
            .Where(s => userIds.Contains(s.UserId))
            .ToDictionaryAsync(s => s.UserId, ct);

        var emails = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Email, ct);

        foreach (var alert in due)
        {
            var listing = alert.StoreListing!;
            var title = listing.RawTitle.Length > 60
                ? listing.RawTitle[..57] + "..."
                : listing.RawTitle;

            var wantsPush = !prefs.TryGetValue(alert.UserId, out var p) || p.PriceAlertsPush;
            var wantsEmail = !prefs.TryGetValue(alert.UserId, out var p2) || p2.PriceAlertsEmail;

            if (wantsPush)
            {
                await _push.SendToUserAsync(
                    alert.UserId,
                    "Price drop",
                    $"{title} is now Rs {listing.Price:N0} at {listing.Store.Name}",
                    new { type = "price_alert", alertId = alert.Id, listingId = listing.Id },
                    ct);
            }

            if (wantsEmail && _email.CanSend && emails.TryGetValue(alert.UserId, out var address))
            {
                try
                {
                    await _email.SendPriceAlertAsync(
                        address, listing.RawTitle, listing.Store.Name,
                        listing.Price, alert.TargetPrice, listing.ProductUrl, ct);
                }
                catch (Exception ex)
                {
                    // Caught here rather than left to the caller: mail is
                    // currently blocked outbound on the host, and one shopper's
                    // undeliverable email must not stop the rest of the batch
                    // being notified by push.
                    _logger.LogWarning(ex, "Price alert email to {Email} failed", address);
                }
            }
        }

        _logger.LogInformation("{Count} price alert(s) fired for store {StoreId}", due.Count, storeId);
        return due.Count;
    }
}
