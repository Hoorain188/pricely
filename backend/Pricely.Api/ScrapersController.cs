using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/v1/admin/scrapers")]
// TODO: [Authorize(Roles = "Admin,Support")]
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
    private static readonly Dictionary<string, string> SyncPaths =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["telemart"] = "/api/sync-telemart",
            ["megapk"]   = "/api/sync-megapk",
        };

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

        if (!SyncPaths.TryGetValue(store.Slug, out var syncPath))
            return BadRequest(new { title = $"No scraper is wired up for {store.Name}" });

        var staleBefore = DateTimeOffset.UtcNow - StaleAfter;
        var alreadyRunning = await _db.ScraperRuns
            .AnyAsync(r => r.StoreId == storeId
                        && r.FinishedAt == null
                        && r.StartedAt > staleBefore, ct);

        if (alreadyRunning)
            return Conflict(new { title = $"A {store.Name} run is already in progress" });

        var run = new ScraperRun
        {
            StoreId      = storeId,
            Status       = ScraperRunStatus.Ok,   // provisional until it finishes
            ItemsScraped = 0,
            StartedAt    = DateTimeOffset.UtcNow,
            FinishedAt   = null
        };

        _db.ScraperRuns.Add(run);
        _log.Record("scraper.rerun", "store", storeId, new { storeName = store.Name });
        await _db.SaveChangesAsync(ct);

        var baseUrl = _config["ScraperApi:BaseUrl"] ?? "http://localhost:5079";

        try
        {
            var client = _http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            var resp = await client.PostAsync($"{baseUrl}{syncPath}", null, ct);
            resp.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            // Close the run as failed, otherwise it sits open for 15 minutes and
            // blocks retries while the scraper API is down.
            run.Status       = ScraperRunStatus.Fail;
            run.ErrorMessage = $"Could not reach the scraper API: {ex.Message}";
            run.FinishedAt   = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);

            return StatusCode(502, new
            {
                title  = "The scraper API did not accept the job",
                detail = ex.Message
            });
        }

        return Accepted(new { jobId = run.Id, store = store.Name });
    }
}