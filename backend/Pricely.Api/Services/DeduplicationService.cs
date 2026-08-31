using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

public class DeduplicationService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DeduplicationService> _logger;

    public DeduplicationService(IServiceProvider services, ILogger<DeduplicationService> logger)
    {
        _services = services;
        _logger = logger;
    }

    /// <summary>
    /// Two listings more than this far apart in price are not the same product.
    /// Title text alone cannot tell a Dawlance DW 115 from a DW 560, or one
    /// Westpoint blender from another, because every store writes model codes
    /// differently. Price is the one signal that does not depend on wording.
    /// </summary>
    private const decimal MaxPriceRatio = 2.5m;

    private static readonly string[] NoiseWords = new[]
    {
        "with", "official", "warranty", "box", "packed", "brand", "new",
        "sim", "dual", "single", "used", "original", "genuine", "sealed",
        "pack", "pakistan", "price", "in", "the", "and", "for", "edition",
        "version", "model", "latest", "smartphone", "mobile", "storage",
        "ram", "rom", "approved", "wifi", "5g", "4g", "lte",
        "inspected", "condition", "gift", "surprise", "free", "top", "rated",
        "best", "just", "like", "high", "performance", "reliable", "affordable",
        "budget", "friendly", "supported", "pubg", "daraz", "battery", "mah",
        "stock", "active", "noise", "cancellation", "anc", "wireless", "true"
    };

    private static readonly string[] AccessoryWords = new[]
    {
        "case", "cover", "casing", "protector", "tempered", "glass", "lens",
        "filter", "clip", "holder", "stand", "pouch", "skin", "sticker",
        "grip", "strap", "mount"
    };

    // Storage is the biggest price differentiator on a phone, so it belongs in
    // the key. It used to be stripped out entirely, which made "Z Fold 8 256GB"
    // and "512GB" identical and merged them at confidence 100.
    private static string ExtractCapacity(string title)
    {
        var t = title.ToLower();
        var sizes = new List<int>();

        foreach (Match m in Regex.Matches(t, @"(\d+)\s*(gb|tb)"))
        {
            if (!int.TryParse(m.Groups[1].Value, out var n)) continue;
            if (m.Groups[2].Value == "tb") n *= 1024;
            sizes.Add(n);
        }

        // "12/256" and "12/512" — RAM first, storage second.
        foreach (Match m in Regex.Matches(t, @"\b(\d{1,2})\s*/\s*(\d{2,4})\b"))
            if (int.TryParse(m.Groups[2].Value, out var n)) sizes.Add(n);

        // RAM is always the smaller figure when a title carries both.
        return sizes.Count == 0 ? "" : "cap" + sizes.Max();
    }

    // Units, not identity. "5g", "128gb", "4385mah" say nothing about which
    // product this is; "7a", "s22" and "wf-738" say everything.
    private static readonly string[] UnitSuffixes =
        { "gb", "tb", "mb", "mah", "hz", "ghz", "mp", "mm", "cm", "inch", "w", "g", "k",
          "nits", "ppi", "wh", "kg", "ml", "fps", "bit", "v", "hrs", "h" };

    private static bool IsUnitToken(string w)
    {
        var m = Regex.Match(w, @"^\d+(?:\.\d+)?([a-z]+)$");
        return m.Success && UnitSuffixes.Contains(m.Groups[1].Value);
    }

    /// <summary>
    /// A token that names *which* product this is — a model designator. Two
    /// listings carrying different ones are different products no matter how
    /// much of the rest of the title they share, which is how five Google
    /// Pixels (6a, 7a, 9a, 10a, 10) ended up in one group.
    /// </summary>
    private static bool IsIdentityToken(string w)
    {
        if (w.StartsWith("cap") || w == "pta" || w == "nonpta") return false;
        if (!w.Any(char.IsDigit) || !w.Any(char.IsLetter)) return false;
        return !IsUnitToken(w);
    }

    public static string BuildMatchKey(string title)
    {
        var t = title.ToLower();

        // Accessory → alag key
        foreach (var acc in AccessoryWords)
        {
            if (t.Contains(acc))
            {
                var clean = Regex.Replace(t, @"[^a-z0-9]", "");
                return "acc:" + clean.Substring(0, Math.Min(30, clean.Length));
            }
        }

        // Daraz jaise lambe titles: pehle separator tak
        foreach (var cp in new[] { '|', '–', '—' })
        {
            var idx = t.IndexOf(cp);
            if (idx > 10) { t = t.Substring(0, idx); break; }
        }

        // brackets hatao
        t = Regex.Replace(t, @"\(.*?\)|\[.*?\]", " ");

        // PTA vs non-PTA is a Rs 85,000 difference on the same handset, so it
        // has to survive into the key as one token rather than a stray "non".
        t = Regex.Replace(t, @"\bnon[\s-]*pta\b", " nonpta ", RegexOptions.IgnoreCase);

        // Storage HATAO (har store nahi likhta)
        t = Regex.Replace(t, @"\d+\s*(gb|tb)\s*(storage|ram|rom)?", " ", RegexOptions.IgnoreCase);

        // Size RAKHO (40mm vs 44mm ahem hai)
        t = Regex.Replace(t, @"(\d+)\s*mm", "$1mm", RegexOptions.IgnoreCase);
        t = Regex.Replace(t, @"(\d+)\s*inch", "$1inch", RegexOptions.IgnoreCase);

        // seller codes hatao (r-l310, l310f)
        // Hyphenated codes like WF-738 are model numbers, not seller codes, and
        // they are often the only thing separating one product from another —
        // 21 different Westpoint blenders collapsed into one group without them.
        // t = Regex.Replace(t, @"\b[a-z]{1,2}-[a-z]?\d{2,4}[a-z]?\b", " ", RegexOptions.IgnoreCase);
        t = Regex.Replace(t, @"\b[a-z]{2,3}\d{3,4}[a-z]\b", " ", RegexOptions.IgnoreCase);

        t = Regex.Replace(t, @"[^a-z0-9\s]", " ");
        var words = t.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        var kept = new List<string>();
        foreach (var w in words)
        {
            if (NoiseWords.Contains(w)) continue;
            if (w.Length <= 1 && !char.IsDigit(w[0])) continue;   // single DIGITS rakho (Watch 7 vs 8)
            kept.Add(w);
        }

        // Agar phir bhi lamba, pehle 8 words
        if (kept.Count > 8) kept = kept.Take(8).ToList();

        var key = string.Join(" ", kept).Trim();
        var cap = ExtractCapacity(title);

        // Appended, so a listing that names no size stays distinct from every
        // listing that does rather than matching all of them.
        return cap.Length > 0 ? key + " " + cap : key;
    }

    // Fuzzy similarity (Level 3 ke liye)
    private static HashSet<string> IdentitySet(HashSet<string> w) =>
        w.Where(IsIdentityToken).ToHashSet();

    /// <summary>
    /// Qualifiers are checked as hard constraints before any word overlap is
    /// considered. Treating them as ordinary words let a high enough overlap
    /// outvote them: "Pixel 10 PTA" and "Pixel 10 non-PTA" share four words
    /// out of five.
    /// </summary>
    private static double Similarity(string a, string b)
    {
        var wa = a.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        var wb = b.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        if (wa.Count == 0 || wb.Count == 0) return 0;

        // Storage: different sizes are different products, different prices.
        var capA = wa.FirstOrDefault(w => w.StartsWith("cap"));
        var capB = wb.FirstOrDefault(w => w.StartsWith("cap"));
        if (capA != null && capB != null && capA != capB) return 0;

        // PTA status.
        var ptaA = wa.Contains("pta") ? "pta" : wa.Contains("nonpta") ? "nonpta" : null;
        var ptaB = wb.Contains("pta") ? "pta" : wb.Contains("nonpta") ? "nonpta" : null;
        if (ptaA != null && ptaB != null && ptaA != ptaB) return 0;

        // Model designators must match exactly, not merely overlap — "10" and
        // "10a" overlapped through their shared capacity token before this.
        var idA = IdentitySet(wa);
        var idB = IdentitySet(wb);
        if (idA.Count > 0 && idB.Count > 0 && !idA.SetEquals(idB)) return 0;

        // Dividing by the smaller set scored a short title that is a subset of
        // a longer one as a perfect match.
        return (double)wa.Intersect(wb).Count() / Math.Max(wa.Count, wb.Count);
    }

    public async Task RunDeduplicationAsync()
    {
        try
        {
            _logger.LogInformation("Deduplication shuru...");

            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Step 0: DB mein saari existing listings ki categories ko naye CategoryMapper se update karo
            var allListings = await db.StoreListings.ToListAsync();
            int updatedCatCount = 0;
            foreach (var l in allListings)
            {
                var correctCategory = CategoryMapper.Map(l.RawTitle, null, l.Category);
                if (l.Category != correctCategory)
                {
                    l.Category = correctCategory;
                    updatedCatCount++;
                }
            }
            if (updatedCatCount > 0)
            {
                await db.SaveChangesAsync();
                _logger.LogInformation("Naye CategoryMapper se {Count} listings ki categories DB mein update kar di hain.", updatedCatCount);
            }

            var listings = await db.StoreListings
                .Select(l => new { l.Id, l.StoreId, l.RawTitle, l.Price })
                .ToListAsync();

            _logger.LogInformation("{Count} listings...", listings.Count);

            var items = listings
                .Select(l => new { l.Id, l.StoreId, l.Price, Key = BuildMatchKey(l.RawTitle) })
                .Where(x => !string.IsNullOrWhiteSpace(x.Key) && x.Key.Length >= 3)
                .ToList();

            var results = new List<(List<long> Ids, decimal Conf, string Status)>();
            var usedIds = new HashSet<long>();

            // LEVEL 1: EXACT key match (brand+model) → matched, confidence 100
            var exactGroups = items
                .GroupBy(x => x.Key)
                .Where(g => g.Select(i => i.StoreId).Distinct().Count() >= 2)
                .ToList();

            int priceSplit = 0;
            foreach (var g in exactGroups)
            {
                // An identical key can still cover different products, so split
                // the group at any price gap wider than the ratio allows.
                var sorted = g.OrderBy(x => x.Price).ToList();
                var runs = new List<List<long>>();
                var run = new List<(long Id, decimal Price)>();

                foreach (var x in sorted)
                {
                    if (run.Count > 0 && (x.Price <= 0 || run[0].Price <= 0 ||
                                          x.Price / run[0].Price > MaxPriceRatio))
                    {
                        runs.Add(run.Select(r => r.Id).ToList());
                        run = new List<(long, decimal)>();
                    }
                    run.Add((x.Id, x.Price));
                }
                if (run.Count > 0) runs.Add(run.Select(r => r.Id).ToList());
                if (runs.Count > 1) priceSplit++;

                foreach (var ids in runs)
                {
                    if (ids.Count < 2) continue;
                    var storeCount = g.Where(x => ids.Contains(x.Id)).Select(x => x.StoreId).Distinct().Count();
                    if (storeCount < 2) continue;
                    results.Add((ids, 100m, "matched"));
                    foreach (var id in ids) usedIds.Add(id);
                }
            }
            _logger.LogInformation("Level 1 (exact brand+model): {C} keys, {P} split on price", exactGroups.Count, priceSplit);

            // LEVEL 2: FUZZY (bache huon par) → needs_review, confidence 70
            var remaining = items
                .Where(x => !usedIds.Contains(x.Id) && !x.Key.StartsWith("acc:"))
                .ToList();

            var blocks = remaining.GroupBy(x => x.Key.Split(' ')[0]).Where(g => g.Count() >= 2).ToList();
            int fuzzyCount = 0;

            foreach (var block in blocks)
            {
                var bi = block.ToList();
                var used = new HashSet<int>();

                for (int i = 0; i < bi.Count; i++)
                {
                    if (used.Contains(i)) continue;
                    var cluster = new List<int> { i };
                    used.Add(i);

                    for (int j = i + 1; j < bi.Count; j++)
                    {
                        if (used.Contains(j)) continue;
                        // Checked against every member, not just the seed, so a
                        // chain of near-matches cannot drift far from where it started.
                        var pricesOk = cluster.All(idx =>
                        {
                            var lo = Math.Min(bi[idx].Price, bi[j].Price);
                            var hi = Math.Max(bi[idx].Price, bi[j].Price);
                            return lo > 0 && hi / lo <= MaxPriceRatio;
                        });

                        if (pricesOk && Similarity(bi[i].Key, bi[j].Key) >= 0.75)
                        {
                            cluster.Add(j); used.Add(j);
                        }
                    }

                    if (cluster.Count >= 2 &&
                        cluster.Select(idx => bi[idx].StoreId).Distinct().Count() >= 2)
                    {
                        results.Add((cluster.Select(idx => bi[idx].Id).ToList(), 70m, "needs_review"));
                        fuzzyCount++;
                    }
                }
            }
            _logger.LogInformation("Level 2 (fuzzy): {C} groups (needs_review)", fuzzyCount);

            // Remember what admins have already said is not a match, before
            // the wipe below throws those rows away.
            var rejectedIdSets = await db.MatchGroups
                .Where(g => g.Status == Pricely.Core.Entities.MatchStatus.Rejected)
                .Select(g => g.Listings.Select(l => l.StoreListingId).ToList())
                .ToListAsync();

            var rejectedPairs = new HashSet<(long, long)>();
            foreach (var rids in rejectedIdSets)
                for (int a = 0; a < rids.Count; a++)
                    for (int b = a + 1; b < rids.Count; b++)
                        rejectedPairs.Add(rids[a] < rids[b] ? (rids[a], rids[b]) : (rids[b], rids[a]));

            _logger.LogInformation("{P} rejected pairs remembered.", rejectedPairs.Count);

            // SAVE
            await db.Database.ExecuteSqlRawAsync(
                @"DELETE FROM match_group_listings WHERE match_group_id IN (
                      SELECT id FROM match_groups WHERE status::text <> 'rejected');");
            await db.Database.ExecuteSqlRawAsync(
                "DELETE FROM match_groups WHERE status::text <> 'rejected';");

            // An admin rejecting a group means "these are not the same thing".
            // Rebuilding it would put the same wrong pairing back in the queue.
            bool HasRejectedPair(List<long> ids)
            {
                for (int a = 0; a < ids.Count; a++)
                    for (int b = a + 1; b < ids.Count; b++)
                    {
                        var key = ids[a] < ids[b] ? (ids[a], ids[b]) : (ids[b], ids[a]);
                        if (rejectedPairs.Contains(key)) return true;
                    }
                return false;
            }
            int skipped = 0;

            foreach (var (ids, conf, status) in results)
            {
                if (HasRejectedPair(ids)) { skipped++; continue; }

                var mg = new Pricely.Core.Entities.MatchGroup
                {
                    Confidence = conf,
                    Status = status == "matched" ? Pricely.Core.Entities.MatchStatus.Matched : Pricely.Core.Entities.MatchStatus.NeedsReview,
                    CreatedAt = DateTimeOffset.UtcNow,
                    Listings = ids.Select(lid => new Pricely.Core.Entities.MatchGroupListing { StoreListingId = lid }).ToList()
                };
                db.MatchGroups.Add(mg);
            }

            await db.SaveChangesAsync();

            _logger.LogInformation("Mukammal. {T} groups ({M} matched, {R} needs_review), {S} rejected pairs skipped.",
                results.Count - skipped, exactGroups.Count, fuzzyCount, skipped);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Deduplication mein masla");
        }
    }
}
