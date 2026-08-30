using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Authorization;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/v1/admin/scrapers")]
[Authorize(Policy = Policies.BackOfficeWrite)]
public class ScrapersController : ControllerBase
{
    /// <summary>
    /// An open run older than this is treated as abandoned rather than active.
    /// Without it, one crashed run locks a store's button permanently, because
    /// nothing in this service closes rows it did not finish itself.
    /// </summary>
    private static readonly TimeSpan StaleAfter = TimeSpan.FromMinutes(15);

    /// <summary>
    /// store slug -> sync endpoint on PriceCompare.Api. Keyed by slug, never by
    /// id: the two databases number their stores differently.
    /// </summary>
    // PriceCompare.Api was folded into this project, so there is no second
    // service to POST to any more — MonitoredSyncService runs in-process and
    // opens its own scraper_runs row.
    private static readonly HashSet<string> SyncableSlugs =
        new(StringComparer.OrdinalIgnoreCase) { "telemart", "megapk", "daraz" };

    private readonly AppDbContext _db;
    private readonly IActivityLogger _log;
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _config;

    public ScrapersController(
        AppDbContext db,
        IActivityLogger log,
        IHttpClientFactory http,
        IConfiguration config)
    {
        _db     = db;
        _log    = log;
        _http   = http;
        _config = config;
    }

    /// <summary>
    /// Trigger a scrape run. Opens a scraper_runs row, then asks PriceCompare.Api
    /// to enqueue the Hangfire job that does the actual scraping.
    /// </summary>
    /// <remarks>
    /// The scraper API queues the job and returns immediately, so a 202 here means
    /// "accepted", not "finished". items_scraped stays 0 and finished_at stays null
    /// until the sync services are changed to close their own run rows.
    /// </remarks>
    [HttpPost("{storeId:long}/run")]
    public async Task<IActionResult> Run(long storeId, CancellationToken ct)
    {
        var store = await _db.Stores.FirstOrDefaultAsync(s => s.Id == storeId, ct);
        if (store is null) return NotFound();

        if (!SyncableSlugs.Contains(store.Slug))
            return BadRequest(new { title = $"No scraper is wired up for {store.Name}" });

        var staleBefore = DateTimeOffset.UtcNow - StaleAfter;
        var alreadyRunning = await _db.ScraperRuns
            .AnyAsync(r => r.StoreId == storeId
                        && r.FinishedAt == null
                        && r.StartedAt > staleBefore, ct);

        if (alreadyRunning)
            return Conflict(new { title = $"A {store.Name} run is already in progress" });

        _log.Record("scraper.rerun", "store", storeId, new { storeName = store.Name });
        await _db.SaveChangesAsync(ct);

        // The job opens and closes its own scraper_runs row, so this must not
        // create one as well.
        BackgroundJob.Enqueue<MonitoredSyncService>(s => s.RunWithMonitoringAsync(store.Slug));

        return Accepted(new { store = store.Name });
    }
}