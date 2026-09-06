using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Authorization;
using Pricely.Core.Dtos;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = Policies.BackOffice)]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardResponse>> Get(CancellationToken ct)
    {
        var now     = DateTimeOffset.UtcNow;
        var weekAgo = now.AddDays(-7);

        var totalUsers      = await _db.Users.CountAsync(u => u.Role == UserRole.User, ct);
        var usersWeekAgo    = await _db.Users.CountAsync(u => u.Role == UserRole.User && u.CreatedAt < weekAgo, ct);
        // Only products that actually carry listings. Twenty-two empty rows —
        // seed data and leftovers from splits — once made this read 24 when two
        // had anything behind them.
        var products        = await _db.Products.CountAsync(p => p.Listings.Any(), ct);
        var productsWeekAgo = await _db.Products.CountAsync(
            p => p.CreatedAt < weekAgo && p.Listings.Any(), ct);
        var activeAlerts    = await _db.PriceAlerts.CountAsync(a => !a.IsTriggered, ct);
        var alertsWeekAgo   = await _db.PriceAlerts.CountAsync(a => !a.IsTriggered && a.CreatedAt < weekAgo, ct);

        var allStores = await _db.Stores.ToListAsync(ct);

        var recentRuns = await _db.ScraperRuns
            .OrderByDescending(r => r.StartedAt)
            .Take(200)
            .ToListAsync(ct);

        var latestRuns = recentRuns
            .GroupBy(r => r.StoreId)
            .Select(g => g.First())
            .ToList();

        // Live count straight from store_listings, per store. This is the
        // source of truth for "how many items do we actually have" - it
        // stays correct even if a scraper run is stuck, failed, or was
        // never wired up to begin with (scraper_runs.ItemsScraped is only
        // set manually/provisionally right now, see ScrapersController).
        var listingCounts = await _db.StoreListings
            .GroupBy(l => l.StoreId)
            .Select(g => new { StoreId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var scrapers = allStores
            .Where(s => s.IsActive)
            .Select(s =>
            {
                var run = latestRuns.FirstOrDefault(r => r.StoreId == s.Id);
                var status = run is null            ? "fail"
                           // A run left open for hours is not running, it died.
                           // Without this the Re-run button stays disabled forever.
                           : run.FinishedAt is null
                               ? (run.StartedAt > DateTimeOffset.UtcNow.AddMinutes(-20) ? "running" : "fail")
                           : run.Status == ScraperRunStatus.Ok ? "ok" : "fail";

                var liveItemCount = listingCounts.FirstOrDefault(l => l.StoreId == s.Id)?.Count ?? 0;

                return new ScraperStatusDto(
                    s.Id, s.Name, status,
                    run?.StartedAt,
                    liveItemCount,
                    CanRun: status != "running");
            })
            .ToList();

        var recentErrors = recentRuns
            // Three-week-old failures were still top of the list. If it has not
            // recurred in a week it is history, not a problem.
            .Where(r => r.Status == ScraperRunStatus.Fail && r.ErrorMessage != null
                     && r.StartedAt >= weekAgo)
            .Take(5)
            .Select(r => new ScraperErrorDto(
                allStores.FirstOrDefault(s => s.Id == r.StoreId)?.Name ?? "Unknown",
                r.ErrorMessage!,
                r.StartedAt))
            .ToList();

        var searchRows = await _db.SearchQueries
            .Where(q => q.CreatedAt >= weekAgo)
            .GroupBy(q => q.QueryText)
            .Select(g => new { Label = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(4)
            .ToListAsync(ct);

        var topSearches = searchRows.Select(x => new RankedItem(x.Label, x.Count)).ToList();

        // Alerts hang off listings, not products — almost nothing is merged, so
        // grouping by ProductId put every alert under a null key and the name
        // lookup came back empty, printing "Unknown".
        var trackedRows = await _db.PriceAlerts
            .Where(a => a.StoreListingId != null)
            .GroupBy(a => a.StoreListingId!.Value)
            .Select(g => new { StoreListingId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(3)
            .ToListAsync(ct);

        var trackedIds = trackedRows.Select(x => x.StoreListingId).ToList();

        var trackedNames = await _db.StoreListings
            .Where(l => trackedIds.Contains(l.Id))
            .Select(l => new { l.Id, Name = l.RawTitle })
            .ToListAsync(ct);

        var mostTracked = trackedRows
            .Select(x => new RankedItem(
                trackedNames.FirstOrDefault(n => n.Id == x.StoreListingId)?.Name ?? "Unknown",
                x.Count))
            .ToList();

        var clickRows = await _db.StoreClicks
            .Where(c => c.CreatedAt >= weekAgo)
            .Join(_db.StoreListings, c => c.StoreListingId, l => l.Id, (c, l) => l.StoreId)
            .GroupBy(storeId => storeId)
            .Select(g => new { StoreId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToListAsync(ct);

        var storeClicks = clickRows
            .Select(x => new RankedItem(
                allStores.FirstOrDefault(s => s.Id == x.StoreId)?.Name ?? "Unknown",
                x.Count))
            .ToList();

        return Ok(new DashboardResponse(
            LastUpdatedAt: latestRuns.Count > 0 ? latestRuns.Max(r => r.StartedAt) : now,
            Kpis: new DashboardKpis(
                new KpiValue(totalUsers,   Growth(usersWeekAgo,    totalUsers)),
                new KpiValue(products,     Growth(productsWeekAgo, products)),
                new KpiValue(activeAlerts, Growth(alertsWeekAgo,   activeAlerts)),
                // A run in progress is not a failure. Counting only "ok" made
                // the card read "2 failing" the moment anyone pressed Re-run,
                // while every row underneath still showed OK.
                ScrapersHealthy: scrapers.Count(s => s.Status is "ok" or "running"),
                ScrapersTotal:   scrapers.Count),
            Scrapers:     scrapers,
            TopSearches:  topSearches,
            MostTracked:  mostTracked,
            StoreClicks:  storeClicks,
            RecentErrors: recentErrors));
    }

    private static double? Growth(int before, int now)
        => before == 0 ? null : Math.Round((now - before) * 100.0 / before, 1);
}