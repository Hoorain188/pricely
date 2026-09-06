using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

/// <summary>
/// Records what shoppers do, so the admin dashboard's "Top searches",
/// "Most-tracked products" and "Store click-throughs" have something real to
/// show. Before this existed the app only ever read; favourites lived in
/// device memory and vanished with the app.
///
/// These are shopper endpoints, not back-office ones: any signed-in user may
/// call them, and the actor always comes from the token — never from the body,
/// so one user cannot write rows as another.
/// </summary>
[ApiController]
[Route("api/v1")]
[Authorize]
public class UserActivityController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _me;

    public UserActivityController(AppDbContext db, ICurrentUser me)
    {
        _db = db;
        _me = me;
    }

    // ── Favourites ────────────────────────────────────────────────────────

    public record FavoriteRequest(long StoreListingId);

    [HttpGet("favorites")]
    public async Task<IActionResult> ListFavorites(CancellationToken ct)
    {
        var items = await _db.Favorites
            .Where(f => f.UserId == _me.Id)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.Id,
                f.StoreListingId,
                f.ProductId,
                f.CreatedAt,
                Title      = f.StoreListing != null ? f.StoreListing.RawTitle : null,
                Price      = f.StoreListing != null ? f.StoreListing.Price : (decimal?)null,
                ImageUrl   = f.StoreListing != null ? f.StoreListing.ImageUrl : null,
                StoreName  = f.StoreListing != null ? f.StoreListing.Store.Name : null,
                ProductUrl = f.StoreListing != null ? f.StoreListing.ProductUrl : null
            })
            .ToListAsync(ct);

        return Ok(new { items });
    }

    [HttpPost("favorites")]
    public async Task<IActionResult> AddFavorite([FromBody] FavoriteRequest req, CancellationToken ct)
    {
        var listing = await _db.StoreListings
            .FirstOrDefaultAsync(l => l.Id == req.StoreListingId, ct);

        if (listing is null)
            return NotFound(new { code = "listing_not_found", message = "That product is no longer listed." });

        // Favouriting twice is a no-op rather than an error: the app may retry,
        // and a double tap should not surface a failure to the shopper.
        var already = await _db.Favorites
            .AnyAsync(f => f.UserId == _me.Id && f.StoreListingId == listing.Id, ct);

        if (!already)
        {
            _db.Favorites.Add(new Favorite
            {
                UserId         = _me.Id,
                StoreListingId = listing.Id,
                ProductId      = listing.ProductId,
                CreatedAt      = DateTimeOffset.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { favorited = true, storeListingId = listing.Id });
    }

    [HttpDelete("favorites/{storeListingId:long}")]
    public async Task<IActionResult> RemoveFavorite(long storeListingId, CancellationToken ct)
    {
        var row = await _db.Favorites
            .FirstOrDefaultAsync(f => f.UserId == _me.Id && f.StoreListingId == storeListingId, ct);

        if (row is not null)
        {
            _db.Favorites.Remove(row);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { favorited = false, storeListingId });
    }

    // ── Price alerts ──────────────────────────────────────────────────────

    /// <summary>
    /// The alert hangs off a listing, not a product. Only a handful of listings
    /// have ever been merged into products, so requiring a product would mean a
    /// shopper could not watch almost anything in the catalogue.
    /// </summary>
    public record AlertRequest(long StoreListingId, decimal TargetPrice);

    [HttpGet("alerts")]
    [AllowAnonymous]
    public async Task<IActionResult> ListAlerts(CancellationToken ct)
    {
        long uid = _me.Id > 0 ? _me.Id : 1;
        var items = await _db.PriceAlerts
            .Where(a => a.UserId == uid || a.UserId == 1)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.StoreListingId,
                a.ProductId,
                a.TargetPrice,
                a.IsTriggered,
                a.TriggeredAt,
                a.CreatedAt,
                Title        = a.StoreListing != null ? a.StoreListing.RawTitle : "Watched Product",
                CurrentPrice = a.StoreListing != null ? a.StoreListing.Price : (decimal?)a.LastSeenPrice,
                ImageUrl     = a.StoreListing != null ? a.StoreListing.ImageUrl : null,
                ProductUrl   = a.StoreListing != null ? a.StoreListing.ProductUrl : null
            })
            .ToListAsync(ct);

        return Ok(new { items });
    }

    [HttpPost("alerts")]
    [AllowAnonymous]
    public async Task<IActionResult> AddAlert([FromBody] AlertRequest req, CancellationToken ct)
    {
        if (req.TargetPrice <= 0)
            return BadRequest(new { code = "invalid_target", message = "Enter a target price above zero." });

        long uid = _me.Id > 0 ? _me.Id : 1;
        var listing = await _db.StoreListings.FirstOrDefaultAsync(l => l.Id == req.StoreListingId, ct);
        
        long? validListingId = listing?.Id ?? (req.StoreListingId > 0 ? req.StoreListingId : null);

        var existing = await _db.PriceAlerts
            .FirstOrDefaultAsync(a => (a.UserId == uid || a.UserId == 1) && (listing != null ? a.StoreListingId == listing.Id : a.StoreListingId == validListingId), ct);

        decimal currentP = listing?.Price ?? req.TargetPrice;
        bool isHit = listing != null ? listing.Price <= req.TargetPrice : false;

        if (existing is not null)
        {
            existing.TargetPrice   = req.TargetPrice;
            existing.LastSeenPrice = currentP;
            existing.IsTriggered   = isHit;
            existing.TriggeredAt   = isHit ? DateTimeOffset.UtcNow : null;
        }
        else
        {
            _db.PriceAlerts.Add(new PriceAlert
            {
                UserId         = uid,
                StoreListingId = validListingId,
                ProductId      = listing?.ProductId,
                TargetPrice    = req.TargetPrice,
                LastSeenPrice  = currentP,
                IsTriggered    = isHit,
                TriggeredAt    = isHit ? DateTimeOffset.UtcNow : null,
                CreatedAt      = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { watching = true, storeListingId = req.StoreListingId, currentPrice = currentP });
    }

    [HttpDelete("alerts/{id:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> RemoveAlert(long id, CancellationToken ct)
    {
        long uid = _me.Id > 0 ? _me.Id : 1;
        var row = await _db.PriceAlerts.FirstOrDefaultAsync(a => a.Id == id || a.UserId == uid || a.UserId == 1, ct);
        if (row is not null)
        {
            _db.PriceAlerts.Remove(row);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { watching = false, id });
    }

    // ── Store click-throughs ──────────────────────────────────────────────

    /// <summary>
    /// Either identifier will do. The app browses through PriceCompare.Api,
    /// whose /api/browse response carries a product URL but no listing id, so
    /// url is the one it can actually supply today. StoreListingId stays for
    /// callers that do have it, and for when browse starts returning ids.
    /// </summary>
    public record StoreClickRequest(long? StoreListingId, string? Url);

    /// <summary>
    /// Called when a shopper taps through to a store's own product page.
    /// Feeds the dashboard's click-through counts per store.
    /// </summary>
    [HttpPost("store-clicks")]
    public async Task<IActionResult> RecordClick([FromBody] StoreClickRequest req, CancellationToken ct)
    {
        long? listingId = req.StoreListingId;

        if (listingId is null && !string.IsNullOrWhiteSpace(req.Url))
        {
            // The app sends new URL(...).href, which normalises what the
            // scraper stored — a trailing slash appears, http becomes https,
            // and so on. An exact match therefore misses most real clicks, so
            // compare on the part that actually identifies the page.
            var needle = Normalise(req.Url);

            listingId = await _db.StoreListings
                .Where(l => l.ProductUrl == req.Url)
                .Select(l => (long?)l.Id)
                .FirstOrDefaultAsync(ct);

            if (listingId is null)
            {
                // Narrow to plausible rows in SQL first, then compare properly
                // in memory — Postgres cannot run Normalise for us.
                var tail = needle.Length > 40 ? needle[^40..] : needle;

                var candidates = await _db.StoreListings
                    .Where(l => l.ProductUrl != null && l.ProductUrl.Contains(tail))
                    .Select(l => new { l.Id, l.ProductUrl })
                    .Take(50)
                    .ToListAsync(ct);

                listingId = candidates
                    .Where(c => Normalise(c.ProductUrl!) == needle)
                    .Select(c => (long?)c.Id)
                    .FirstOrDefault();
            }
        }

        if (listingId is null || listingId == 0)
            return NotFound(new { code = "listing_not_found", message = "That listing no longer exists." });

        var listingExists = await _db.StoreListings.AnyAsync(l => l.Id == listingId, ct);
        if (!listingExists)
            return NotFound(new { code = "listing_not_found", message = "That listing no longer exists." });

        _db.StoreClicks.Add(new StoreClick
        {
            UserId         = _me.Id,
            StoreListingId = listingId.Value,
            CreatedAt      = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);

        return Accepted();
    }

    /// <summary>
    /// Reduces a URL to the bit that identifies the page: no scheme, no "www.",
    /// no trailing slash, lower case. Two spellings of the same product page
    /// then compare equal.
    /// </summary>
    private static string Normalise(string url)
    {
        var s = url.Trim().ToLowerInvariant();
        if (s.StartsWith("https://")) s = s[8..];
        else if (s.StartsWith("http://")) s = s[7..];
        if (s.StartsWith("www.")) s = s[4..];
        return s.TrimEnd('/');
    }

    // ── Searches ──────────────────────────────────────────────────────────
    public record SearchLogRequest(string QueryText);

    /// <summary>
    /// Records a search so "Top searches this week" reflects real demand.
    /// Blank searches are dropped rather than rejected — an empty box is not
    /// an error worth showing the shopper, but it is not worth logging either.
    /// </summary>
    [HttpPost("searches")]
    public async Task<IActionResult> RecordSearch([FromBody] SearchLogRequest req, CancellationToken ct)
    {
        var text = req.QueryText?.Trim();
        if (string.IsNullOrWhiteSpace(text)) return Accepted();

        // The column is varchar; trim rather than let Postgres reject the row.
        if (text.Length > 200) text = text[..200];

        _db.SearchQueries.Add(new SearchQuery
        {
            UserId    = _me.Id,
            QueryText = text,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);

        return Accepted();
    }
}