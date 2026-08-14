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
    private readonly AppDbContext _db;
    private readonly IActivityLogger _log;

    public ScrapersController(AppDbContext db, IActivityLogger log)
    {
        _db  = db;
        _log = log;
    }

    /// <summary>
    /// Ask for a scrape run. Opens a scraper_runs row with no finished_at,
    /// which the dashboard reads as "running".
    /// </summary>
    /// <remarks>
    /// This only records the intent. Nothing scrapes yet — whoever builds the
    /// scraper should pick up open runs (finished_at IS NULL) and complete
    /// them, or replace this with a call into their job queue.
    /// </remarks>
    [HttpPost("{storeId:long}/run")]
    public async Task<IActionResult> Run(long storeId, CancellationToken ct)
    {
        var store = await _db.Stores.FirstOrDefaultAsync(s => s.Id == storeId, ct);
        if (store is null) return NotFound();

        var alreadyRunning = await _db.ScraperRuns
            .AnyAsync(r => r.StoreId == storeId && r.FinishedAt == null, ct);

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

        return Accepted(new { jobId = run.Id, store = store.Name });
    }
}