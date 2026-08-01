using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Dtos;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
// TODO: [Authorize(Roles = "Admin,Support")] on the write actions,
//       [Authorize(Roles = "Admin,Support,ReadOnly")] on the list.
public class DuplicatesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IActivityLogger _log;
    private readonly ICurrentUser _me;

    public DuplicatesController(AppDbContext db, IActivityLogger log, ICurrentUser me)
    {
        _db  = db;
        _log = log;
        _me  = me;
    }

    /// <summary>Candidate duplicate groups. status=pending drives "Needs review", status=merged drives "Merged".</summary>
    [HttpGet("duplicates")]
    public async Task<ActionResult<DuplicatesResponse>> List(
        [FromQuery] string status = "pending",
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var wanted = status.Equals("merged", StringComparison.OrdinalIgnoreCase)
            ? MatchStatus.Matched
            : MatchStatus.NeedsReview;

        // Both tab counters come back on every call so the UI can update
        // them after a merge without a second request.
        var pendingCount = await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.NeedsReview, ct);
        var mergedCount  = await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.Matched, ct);

        var query = _db.MatchGroups
            .Where(g => g.Status == wanted)
            .Include(g => g.Listings).ThenInclude(l => l.StoreListing).ThenInclude(sl => sl.Store)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(g => g.Listings.Any(l => EF.Functions.ILike(l.StoreListing.RawTitle, $"%{q}%")));

        var total = await query.CountAsync(ct);

        var groups = await query
            .OrderByDescending(g => g.Confidence)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = groups.Select(g =>
        {
            var listings = g.Listings
                .Select(l => l.StoreListing)
                .OrderBy(sl => sl.Price)
                .ToList();

            return new DuplicateGroupDto(
                g.Id,
                // The group has no title of its own; use the longest listing
                // title, which is usually the most complete one.
                listings.OrderByDescending(sl => sl.RawTitle.Length).FirstOrDefault()?.RawTitle ?? "Untitled",
                (int)Math.Round(g.Confidence * 100),
                // Null until merged. The Split button needs this — passing a
                // listing id instead silently splits the wrong thing.
                listings.FirstOrDefault(sl => sl.ProductId != null)?.ProductId,
                listings.Select((sl, i) => new ListingDto(
                    sl.Id,
                    sl.RawTitle,
                    sl.Store.Name,
                    sl.Price,
                    "PKR",
                    // Pre-tick everything except the weakest match, mirroring the mock.
                    PreSelected: i < listings.Count - 1 || listings.Count == 1)).ToList());
        }).ToList();

        return Ok(new DuplicatesResponse(
            pendingCount, mergedCount, items, page,
            TotalPages: (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Merge the selected listings into one product.</summary>
    [HttpPost("duplicates/{groupId:long}/merge")]
    public async Task<ActionResult<DuplicateActionResponse>> Merge(
        long groupId, MergeRequest req, CancellationToken ct)
    {
        if (req.ListingIds.Count < 2)
            return BadRequest(new { title = "Select at least two listings to merge" });

        var group = await _db.MatchGroups
            .Include(g => g.Listings).ThenInclude(l => l.StoreListing)
            .FirstOrDefaultAsync(g => g.Id == groupId, ct);

        if (group is null) return NotFound();

        if (group.Status != MatchStatus.NeedsReview)
            return Conflict(new { title = "This group has already been actioned" });

        var listings = group.Listings
            .Select(l => l.StoreListing)
            .Where(sl => req.ListingIds.Contains(sl.Id))
            .ToList();

        if (listings.Count != req.ListingIds.Count)
            return BadRequest(new { title = "Some listings do not belong to this group" });

        // Reuse an existing product if one of the listings already has one,
        // otherwise create it from the most descriptive title.
        var productId = listings.FirstOrDefault(l => l.ProductId != null)?.ProductId;

        if (productId is null)
        {
            var product = new Product
            {
                Name      = listings.OrderByDescending(l => l.RawTitle.Length).First().RawTitle,
                ImageUrl  = listings.FirstOrDefault(l => l.ImageUrl != null)?.ImageUrl,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Products.Add(product);
            await _db.SaveChangesAsync(ct);
            productId = product.Id;
        }

        foreach (var l in listings)
        {
            l.ProductId   = productId;
            l.MatchStatus = MatchStatus.Matched;
        }

        group.Status     = MatchStatus.Matched;
        group.ResolvedBy = _me.Id;
        group.ResolvedAt = DateTimeOffset.UtcNow;

        _log.Record("duplicates.merged", "match_group", groupId,
            new { productId, listingCount = listings.Count });

        await _db.SaveChangesAsync(ct);

        return Ok(new DuplicateActionResponse(
            productId,
            await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.NeedsReview, ct),
            await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.Matched, ct)));
    }

    /// <summary>"Not a match" — the listings go back to unmatched so the matcher can retry.</summary>
    [HttpPost("duplicates/{groupId:long}/reject")]
    public async Task<ActionResult<DuplicateActionResponse>> Reject(long groupId, CancellationToken ct)
    {
        var group = await _db.MatchGroups
            .Include(g => g.Listings).ThenInclude(l => l.StoreListing)
            .FirstOrDefaultAsync(g => g.Id == groupId, ct);

        if (group is null) return NotFound();

        if (group.Status != MatchStatus.NeedsReview)
            return Conflict(new { title = "This group has already been actioned" });

        foreach (var l in group.Listings)
            l.StoreListing.MatchStatus = MatchStatus.Unmatched;

        group.Status     = MatchStatus.Rejected;
        group.ResolvedBy = _me.Id;
        group.ResolvedAt = DateTimeOffset.UtcNow;

        _log.Record("duplicates.rejected", "match_group", groupId);
        await _db.SaveChangesAsync(ct);

        return Ok(new DuplicateActionResponse(
            null,
            await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.NeedsReview, ct),
            await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.Matched, ct)));
    }

    /// <summary>
    /// Undo a merge. Listings become their own products again AND the group
    /// goes back to needs_review, so it reappears in the review queue.
    /// Without reopening the group the split row vanishes from both tabs.
    /// </summary>
    [HttpPost("products/{productId:long}/split")]
    public async Task<ActionResult<DuplicateActionResponse>> Split(long productId, CancellationToken ct)
    {
        var listings = await _db.StoreListings
            .Where(l => l.ProductId == productId)
            .ToListAsync(ct);

        if (listings.Count == 0) return NotFound();

        var listingIds = listings.Select(l => l.Id).ToList();

        // Find the group these listings were merged under.
        var group = await _db.MatchGroups
            .Include(g => g.Listings)
            .Where(g => g.Status == MatchStatus.Matched
                        && g.Listings.Any(gl => listingIds.Contains(gl.StoreListingId)))
            .FirstOrDefaultAsync(ct);

        foreach (var l in listings)
        {
            l.ProductId   = null;
            l.MatchStatus = MatchStatus.NeedsReview;
        }

        if (group is not null)
        {
            group.Status     = MatchStatus.NeedsReview;
            group.ResolvedBy = null;
            group.ResolvedAt = null;
        }

        var product = await _db.Products.FindAsync([productId], ct);

        _log.Record("duplicates.split", "product", productId,
            new { productName = product?.Name, listingCount = listings.Count });

        await _db.SaveChangesAsync(ct);

        return Ok(new DuplicateActionResponse(
            null,
            await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.NeedsReview, ct),
            await _db.MatchGroups.CountAsync(g => g.Status == MatchStatus.Matched, ct)));
    }
}