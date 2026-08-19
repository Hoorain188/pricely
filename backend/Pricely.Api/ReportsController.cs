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
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReportsController(AppDbContext db) => _db = db;

    [HttpGet("reports")]
    public async Task<ActionResult<ReportsResponse>> Reports(
        [FromQuery] string period = "weekly", CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;

        var (from, prevFrom) = period.ToLowerInvariant() switch
        {
            "monthly" => (now.AddMonths(-1), now.AddMonths(-2)),
            "yearly"  => (now.AddYears(-1),  now.AddYears(-2)),
            _         => (now.AddDays(-7),   now.AddDays(-14))
        };

        // Active shoppers = distinct users who searched in the window.
        var active = await _db.SearchQueries
            .Where(s => s.CreatedAt >= from && s.UserId != null)
            .Select(s => s.UserId).Distinct().CountAsync(ct);

        var activePrev = await _db.SearchQueries
            .Where(s => s.CreatedAt >= prevFrom && s.CreatedAt < from && s.UserId != null)
            .Select(s => s.UserId).Distinct().CountAsync(ct);

        var trendingRows = await _db.SearchQueries
            .Where(s => s.CreatedAt >= from)
            .GroupBy(s => s.QueryText)
            .Select(g => new { Label = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(4)
            .ToListAsync(ct);

        var trending = trendingRows.Select(x => new RankedItem(x.Label, x.Count)).ToList();

        var saved = await CalculateSavingsAsync(from, ct);

        return Ok(new ReportsResponse(
            period,
            new KpiValue(active, activePrev == 0 ? null
                : Math.Round((active - activePrev) * 100.0 / activePrev, 1)),
            new MoneyValue(saved, "PKR"),
            trending,
            await PriceChangesAsync(from, ct),
            await StoreAveragesAsync(ct),
            await CategoryBreakdownAsync(from, ct)));
    }

    /// <summary>
    /// Biggest movers in the period: first recorded price vs last, per product.
    /// Reads price_history, which is the only table that knows what a price
    /// used to be — store_listings only holds the current one.
    /// </summary>
    private async Task<IReadOnlyList<PriceChangeDto>> PriceChangesAsync(
        DateTimeOffset from, CancellationToken ct)
    {
        var points = await _db.PriceHistory
            .Where(h => h.RecordedAt >= from)
            .Join(_db.StoreListings, h => h.StoreListingId, l => l.Id,
                  (h, l) => new { l.ProductId, h.Price, h.RecordedAt })
            .Where(x => x.ProductId != null)
            .ToListAsync(ct);

        if (points.Count == 0) return [];

        var productIds = points.Select(x => x.ProductId!.Value).Distinct().ToList();

        var names = await _db.Products
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name })
            .ToListAsync(ct);

        return points
            .GroupBy(x => x.ProductId!.Value)
            .Select(g =>
            {
                var ordered = g.OrderBy(x => x.RecordedAt).ToList();
                var first = ordered.First().Price;
                var last  = ordered.Last().Price;

                return new PriceChangeDto(
                    names.FirstOrDefault(n => n.Id == g.Key)?.Name ?? "Unknown",
                    first, last,
                    first == 0 ? 0 : Math.Round((double)((last - first) * 100 / first), 1));
            })
            // Largest movement in either direction first — a big rise matters
            // as much as a big drop when you are watching the market.
            .Where(c => c.ChangePercent != 0)
            .OrderByDescending(c => Math.Abs(c.ChangePercent))
            .Take(5)
            .ToList();
    }

    /// <summary>Average listing price per store. Shows which store tends to be cheapest.</summary>
    private async Task<IReadOnlyList<MoneyRankedItem>> StoreAveragesAsync(CancellationToken ct)
    {
        var rows = await _db.StoreListings
            .GroupBy(l => l.StoreId)
            .Select(g => new { StoreId = g.Key, Avg = g.Average(l => l.Price) })
            .ToListAsync(ct);

        var stores = await _db.Stores.Select(s => new { s.Id, s.Name }).ToListAsync(ct);

        return rows
            .Select(r => new MoneyRankedItem(
                stores.FirstOrDefault(s => s.Id == r.StoreId)?.Name ?? "Unknown",
                Math.Round(r.Avg, 0)))
            .OrderBy(r => r.Amount)
            .ToList();
    }

    /// <summary>
    /// Which categories shoppers actually click into. Routes
    /// store_clicks -> store_listings -> products -> categories.
    /// </summary>
    private async Task<IReadOnlyList<RankedItem>> CategoryBreakdownAsync(
        DateTimeOffset from, CancellationToken ct)
    {
        var rows = await _db.StoreClicks
            .Where(c => c.CreatedAt >= from)
            .Join(_db.StoreListings, c => c.StoreListingId, l => l.Id, (c, l) => l.ProductId)
            .Where(pid => pid != null)
            .Join(_db.Products, pid => pid!.Value, p => p.Id, (pid, p) => p.CategoryId)
            .Where(cid => cid != null)
            .GroupBy(cid => cid!.Value)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        if (rows.Count == 0) return [];

        var categories = await _db.Categories.Select(c => new { c.Id, c.Name }).ToListAsync(ct);

        return rows
            .Select(r => new RankedItem(
                categories.FirstOrDefault(c => c.Id == r.CategoryId)?.Name ?? "Uncategorised",
                r.Count))
            .OrderByDescending(r => r.Count)
            .ToList();
    }

    /// <summary>
    /// "Saved by shoppers" — the definition was never agreed, so this is a
    /// stand-in: for every click-through, the gap between the most expensive
    /// offer for that product and the one actually clicked. Counts only
    /// products that had more than one offer at click time.
    /// AGREE THE REAL FORMULA before this number goes in front of anyone.
    /// </summary>
    private async Task<decimal> CalculateSavingsAsync(DateTimeOffset from, CancellationToken ct)
    {
        var clicked = await _db.StoreClicks
            .Where(c => c.CreatedAt >= from)
            .Join(_db.StoreListings, c => c.StoreListingId, l => l.Id,
                  (c, l) => new { l.ProductId, l.Price })
            .Where(x => x.ProductId != null)
            .ToListAsync(ct);

        if (clicked.Count == 0) return 0;

        var productIds = clicked.Select(x => x.ProductId!.Value).Distinct().ToList();

        var maxByProduct = await _db.StoreListings
            .Where(l => l.ProductId != null && productIds.Contains(l.ProductId.Value))
            .GroupBy(l => l.ProductId!.Value)
            .Select(g => new { ProductId = g.Key, Max = g.Max(l => l.Price), Count = g.Count() })
            .ToListAsync(ct);

        decimal total = 0;

        foreach (var c in clicked)
        {
            var stats = maxByProduct.FirstOrDefault(m => m.ProductId == c.ProductId);
            if (stats is { Count: > 1 })
                total += stats.Max - c.Price;
        }

        return total;
    }

    /// <summary>Activity log. Sentences are rendered here, not in the app.</summary>
    [HttpGet("activity")]
    public async Task<ActionResult<ActivityResponse>> Activity(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken ct = default)
    {
        var total = await _db.ActivityLog.CountAsync(ct);

        var rows = await _db.ActivityLog
            .Include(a => a.Actor)
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = rows
            .Select(a => new ActivityEntryDto(a.Id, Describe(a), a.Actor?.Name ?? "System", a.CreatedAt))
            .ToList();

        return Ok(new ActivityResponse(
            items, page, (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>
    /// Turns an action code plus its jsonb details into a readable sentence.
    /// Keeping this on the server means a new action type does not require
    /// shipping a new build of the app.
    /// </summary>
    private static string Describe(ActivityLogEntry a)
    {
        var d = string.IsNullOrWhiteSpace(a.Details)
            ? new System.Text.Json.JsonElement()
            : System.Text.Json.JsonDocument.Parse(a.Details).RootElement;

        string Get(string key) =>
            d.ValueKind == System.Text.Json.JsonValueKind.Object &&
            d.TryGetProperty(key, out var v) ? v.ToString() : "";

        return a.Action switch
        {
            "duplicates.merged"   => $"Merged \"{Get("productName")}\" duplicate group".Replace("\"\" ", ""),
            "duplicates.rejected" => "Marked a duplicate group as not a match",
            "duplicates.split"    => $"Split \"{Get("productName")}\" back into separate listings",
            "team.invited"        => $"Invited {Get("email")} as {Get("role")}",
            "team.role_changed"   => $"Changed {Get("name")}'s role to {Get("to")}",
            "team.removed"        => $"Removed {Get("name")} from the team",
            "scraper.rerun"       => $"Re-ran the {Get("storeName")} scraper",
            _                     => a.Action
        };
    }
}