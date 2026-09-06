using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Authorization;
using Pricely.Api.Services;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

/// <summary>
/// Runs the price-alert check by hand.
///
/// It normally runs at the end of each scrape, which is the right moment —
/// prices have just changed. This exists for the times that is not enough:
/// prices corrected directly in the database, a scrape that finished while
/// the alert check itself was failing, or simply confirming the path works
/// without waiting six hours for the next sync.
/// </summary>
[ApiController]
[Route("api/v1/admin/alerts")]
[Authorize(Policy = Policies.BackOfficeWrite)]
public class AdminAlertsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPriceAlertChecker _checker;

    public AdminAlertsController(AppDbContext db, IPriceAlertChecker checker)
    {
        _db = db;
        _checker = checker;
    }

    public record CheckResult(int Fired, int StoresChecked);

    /// <summary>Checks every active store and returns how many alerts fired.</summary>
    [HttpPost("check")]
    public async Task<ActionResult<CheckResult>> Check(CancellationToken ct)
    {
        var storeIds = await _db.Stores.Where(s => s.IsActive).Select(s => s.Id).ToListAsync(ct);

        var fired = 0;
        foreach (var id in storeIds)
            fired += await _checker.CheckStoreAsync(id, ct);

        return Ok(new CheckResult(fired, storeIds.Count));
    }
}
