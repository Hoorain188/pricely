using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

/// <summary>
/// A shopper's price alerts.
///
/// These used to live in the app's in-memory store, so they were gone the
/// moment it closed and the server never knew about them — which meant
/// nothing could ever check a price or tell anyone it had dropped. They are
/// rows now, and PriceAlertChecker reads them after each scrape.
/// </summary>
[ApiController]
[Route("api/v1/me/alerts")]
[Authorize]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _me;

    public AlertsController(AppDbContext db, ICurrentUser me)
    {
        _db = db;
        _me = me;
    }

    public record AlertDto(
        long Id,
        long? StoreListingId,
        string Title,
        string StoreName,
        decimal CurrentPrice,
        decimal TargetPrice,
        bool IsTriggered,
        bool IsActive,
        DateTimeOffset CreatedAt,
        DateTimeOffset? TriggeredAt,
        string? ImageUrl);

    public record CreateAlertRequest(long StoreListingId, decimal TargetPrice);

    /// <summary>Everything this shopper is watching, newest first.</summary>
    [HttpGet]
    public async Task<ActionResult<List<AlertDto>>> List(CancellationToken ct)
    {
        var alerts = await _db.PriceAlerts
            .Where(a => a.UserId == _me.Id)
            .Include(a => a.StoreListing).ThenInclude(l => l!.Store)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

        return Ok(alerts.Select(a => new AlertDto(
            a.Id,
            a.StoreListingId,
            a.StoreListing?.RawTitle ?? "Unknown product",
            a.StoreListing?.Store.Name ?? "",
            a.StoreListing?.Price ?? 0,
            a.TargetPrice,
            a.IsTriggered,
            a.IsActive,
            a.CreatedAt,
            a.TriggeredAt,
            a.StoreListing?.ImageUrl)).ToList());
    }

    /// <summary>Starts watching a listing for a price at or below the target.</summary>
    [HttpPost]
    public async Task<ActionResult<AlertDto>> Create(CreateAlertRequest req, CancellationToken ct)
    {
        if (req.TargetPrice <= 0)
            return BadRequest(new { title = "Enter a target price above zero" });

        var listing = await _db.StoreListings
            .Include(l => l.Store)
            .FirstOrDefaultAsync(l => l.Id == req.StoreListingId, ct);

        if (listing is null)
            return NotFound(new { title = "That product is no longer listed" });

        // Nothing to wait for — say so rather than creating an alert that
        // fires on the next scrape and looks like a system that lagged.
        if (listing.Price <= req.TargetPrice)
            return BadRequest(new
            {
                title = $"This is already Rs {listing.Price:N0} — at or below your target"
            });

        var existing = await _db.PriceAlerts.FirstOrDefaultAsync(
            a => a.UserId == _me.Id && a.StoreListingId == req.StoreListingId, ct);

        if (existing is not null)
        {
            // Setting a new target on the same listing replaces the old one and
            // arms it again, rather than leaving a stale triggered row behind.
            existing.TargetPrice = req.TargetPrice;
            existing.IsTriggered = false;
            existing.TriggeredAt = null;
            await _db.SaveChangesAsync(ct);
            return Ok(ToDto(existing, listing));
        }

        var alert = new PriceAlert
        {
            UserId = _me.Id,
            StoreListingId = req.StoreListingId,
            ProductId = null,
            TargetPrice = req.TargetPrice,
            IsTriggered = false,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.PriceAlerts.Add(alert);
        await _db.SaveChangesAsync(ct);

        return Ok(ToDto(alert, listing));
    }

    public record SetActiveRequest(bool IsActive);

    /// <summary>
    /// Switches an alert off without deleting it — the toggle on the Alerts
    /// screen, which until now changed nothing but a value in the app's
    /// memory, so a "paused" alert still fired.
    /// </summary>
    [HttpPatch("{id:long}")]
    public async Task<IActionResult> SetActive(long id, SetActiveRequest req, CancellationToken ct)
    {
        var alert = await _db.PriceAlerts
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == _me.Id, ct);

        if (alert is null) return NotFound();

        alert.IsActive = req.IsActive;

        // Switching one back on re-arms it, so a drop that happened while it
        // was off is announced next time rather than being missed for good.
        if (req.IsActive && alert.IsTriggered)
        {
            alert.IsTriggered = false;
            alert.TriggeredAt = null;
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Stops watching.</summary>
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        // Scoped to the caller: an id alone must not let anyone delete
        // somebody else's alert.
        var removed = await _db.PriceAlerts
            .Where(a => a.Id == id && a.UserId == _me.Id)
            .ExecuteDeleteAsync(ct);

        return removed == 0 ? NotFound() : NoContent();
    }

    private static AlertDto ToDto(PriceAlert a, StoreListing l) => new(
        a.Id, a.StoreListingId, l.RawTitle, l.Store.Name,
        l.Price, a.TargetPrice, a.IsTriggered, a.IsActive, a.CreatedAt, a.TriggeredAt, l.ImageUrl);
}
