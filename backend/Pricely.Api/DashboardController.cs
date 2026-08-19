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
        var products        = await _db.Products.CountAsync(ct);
        var productsWeekAgo = await _db.Products.CountAsync(p => p.CreatedAt < weekAgo, ct);
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
                           : run.FinishedAt is null ? "running"
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
            .Where(r => r.Status == ScraperRunStatus.Fail && r.ErrorMessage != null)
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

        var trackedRows = await _db.PriceAlerts
            .GroupBy(a => a.ProductId)
            .Select(g => new { ProductId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(3)
            .ToListAsync(ct);

        var trackedIds = trackedRows.Select(x => x.ProductId).ToList();
        var trackedNames = await _db.Products
            .Where(p => trackedIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name })
            .ToListAsync(ct);

        var mostTracked = trackedRows
            .Select(x => new RankedItem(
                trackedNames.FirstOrDefault(n => n.Id == x.ProductId)?.Name ?? "Unknown",
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
                ScrapersHealthy: scrapers.Count(s => s.Status == "ok"),
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