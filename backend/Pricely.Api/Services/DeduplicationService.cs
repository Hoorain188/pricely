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

    private static readonly string[] NoiseWords = new[]
    {
        "with", "official", "warranty", "box", "packed", "brand", "new",
        "sim", "dual", "single", "used", "original", "genuine", "sealed",
        "pack", "pakistan", "price", "in", "the", "and", "for", "edition",
        "version", "model", "latest", "smartphone", "mobile", "storage",
        "ram", "rom", "approved", "pta", "non", "nonpta", "wifi", "5g", "4g", "lte",
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

        // Storage HATAO (har store nahi likhta)
        t = Regex.Replace(t, @"\d+\s*(gb|tb)\s*(storage|ram|rom)?", " ", RegexOptions.IgnoreCase);

        // Size RAKHO (40mm vs 44mm ahem hai)
        t = Regex.Replace(t, @"(\d+)\s*mm", "$1mm", RegexOptions.IgnoreCase);
        t = Regex.Replace(t, @"(\d+)\s*inch", "$1inch", RegexOptions.IgnoreCase);

        // seller codes hatao (r-l310, l310f)
        t = Regex.Replace(t, @"\b[a-z]{1,2}-[a-z]?\d{2,4}[a-z]?\b", " ", RegexOptions.IgnoreCase);
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

        return string.Join(" ", kept).Trim();
    }

    // Fuzzy similarity (Level 3 ke liye)
    private static double Similarity(string a, string b)
    {
        var wa = a.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        var wb = b.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        if (wa.Count == 0 || wb.Count == 0) return 0;

        var numsA = wa.Where(w => w.Any(char.IsDigit)).ToHashSet();
        var numsB = wb.Where(w => w.Any(char.IsDigit)).ToHashSet();
        if (numsA.Count > 0 && numsB.Count > 0 && !numsA.Overlaps(numsB)) return 0;

        return (double)wa.Intersect(wb).Count() / Math.Min(wa.Count, wb.Count);
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
                .Select(l => new { l.Id, l.StoreId, l.RawTitle })
                .ToListAsync();

            _logger.LogInformation("{Count} listings...", listings.Count);

            var items = listings
                .Select(l => new { l.Id, l.StoreId, Key = BuildMatchKey(l.RawTitle) })
                .Where(x => !string.IsNullOrWhiteSpace(x.Key) && x.Key.Length >= 3)
                .ToList();

            var results = new List<(List<long> Ids, decimal Conf, string Status)>();
            var usedIds = new HashSet<long>();

            // LEVEL 1: EXACT key match (brand+model) → matched, confidence 100
            var exactGroups = items
                .GroupBy(x => x.Key)
                .Where(g => g.Select(i => i.StoreId).Distinct().Count() >= 2)
                .ToList();

            foreach (var g in exactGroups)
            {
                var ids = g.Select(x => x.Id).ToList();
                results.Add((ids, 100m, "matched"));
                foreach (var id in ids) usedIds.Add(id);
            }
            _logger.LogInformation("Level 1 (exact brand+model): {C} groups", exactGroups.Count);

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
                        if (Similarity(bi[i].Key, bi[j].Key) >= 0.75)
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

            // SAVE
            await db.Database.ExecuteSqlRawAsync("DELETE FROM match_group_listings;");
            await db.Database.ExecuteSqlRawAsync("DELETE FROM match_groups;");

            foreach (var (ids, conf, status) in results)
            {
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

            _logger.LogInformation("Mukammal. {T} groups ({M} matched, {R} needs_review)",
                results.Count, exactGroups.Count, fuzzyCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Deduplication mein masla");
        }
    }
}
