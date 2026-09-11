using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

public class DarazSyncService : IStoreConnector
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IServiceProvider _services;
    private readonly ILogger<DarazSyncService> _logger;

    public string StoreName => "Daraz";

    // Har category ke liye search terms (Daraz search par chalta hai)
    private static readonly (string Query, string Category)[] SearchTerms = new[]
    {
        // Mobiles & Tablets
        ("smartphone",        "mobiles_tablets"),
        ("tablet",            "mobiles_tablets"),

        // Laptops & Computers
        ("laptop",            "laptops_computers"),
        ("desktop computer",  "laptops_computers"),
        ("monitor",           "laptops_computers"),
        ("printer",           "laptops_computers"),

        // TVs & Home Entertainment
        ("led tv",            "tv_entertainment"),
        ("projector",         "tv_entertainment"),

        // Home Appliances
        ("refrigerator",      "home_appliances"),
        ("air conditioner",   "home_appliances"),
        ("washing machine",   "home_appliances"),
        ("microwave oven",    "home_appliances"),

        // Kitchen Appliances
        ("blender",           "kitchen_appliances"),
        ("air fryer",         "kitchen_appliances"),
        ("toaster",           "kitchen_appliances"),

        // Cameras & Accessories
        ("dslr camera",       "cameras"),
        ("camera lens",       "cameras"),

        // Audio
        ("headphones",        "audio"),
        ("bluetooth speaker", "audio"),
        ("earbuds",           "audio"),

        // Wearables
        ("smart watch",       "wearables"),
        ("fitness band",      "wearables"),

        // Gaming
        ("gaming console",    "gaming"),
        ("gaming controller", "gaming"),
    };

    private const int MaxPagesPerTerm = 5;   // har search term se kitne pages (40/page)

    public DarazSyncService(
        IHttpClientFactory httpFactory,
        IServiceProvider services,
        ILogger<DarazSyncService> logger)
    {
        _httpFactory = httpFactory;
        _services = services;
        _logger = logger;
    }



    public async Task SyncAllProductsAsync()
    {
        try
        {
            _logger.LogInformation("Daraz catalog sync shuru...");

            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var daraz = await db.Stores.FirstOrDefaultAsync(s => s.Slug == "daraz");
            if (daraz is null)


            {
                _logger.LogWarning("Daraz store DB mein nahi. Pehle stores table mein add karein.");
                return;
            }

            // Every Daraz listing in one query. Looking each product up
            // individually meant ~9,000 round trips to a cloud database, which
            // is where the time went — the same change took Telemart from 47
            // minutes to 6 seconds.
            var existingByUrl = (await db.StoreListings
                    .Where(l => l.StoreId == daraz.Id && l.ProductUrl != null)
                    .ToListAsync())
                // Daraz lists the same URL under more than one category, and
                // ToDictionary throws on the duplicate, taking the sync with it.
                .GroupBy(l => l.ProductUrl!)
                .ToDictionary(g => g.Key, g => g.First());

            var http = _httpFactory.CreateClient();
            http.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36");
            http.DefaultRequestHeaders.Add("Accept", "application/json");

            int totalSaved = 0;

            foreach (var (query, category) in SearchTerms)
            {
                _logger.LogInformation("=== Daraz: '{Query}' → {Cat} ===", query, category);
                var seenIds = new HashSet<string>();

                for (int page = 1; page <= MaxPagesPerTerm; page++)
                {
                    var url = $"https://www.daraz.pk/catalog/?ajax=true&isFirstRequest=true" +
                              $"&page={page}&q={Uri.EscapeDataString(query)}";

                    List<JsonElement> items;
                    try
                    {
                        var json = await http.GetStringAsync(url);
                        using var doc = JsonDocument.Parse(json);

                        if (!doc.RootElement.TryGetProperty("mods", out var mods) ||
                            !mods.TryGetProperty("listItems", out var listItems) ||
                            listItems.ValueKind != JsonValueKind.Array)
                        {
                            _logger.LogInformation("  Page {Page}: listItems nahi mile. Term khatam.", page);
                            break;
                        }

                        items = listItems.EnumerateArray().Select(e => e.Clone()).ToList();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "  Page {Page} laane mein masla", page);
                        break;
                    }

                    if (items.Count == 0)
                    {
                        _logger.LogInformation("  Page {Page}: khaali. Term khatam.", page);
                        break;
                    }

                    int freshThisPage = 0;

                    foreach (var item in items)
                    {
                        var nid = item.TryGetProperty("nid", out var nidE) ? nidE.GetString() : null;
                        if (string.IsNullOrEmpty(nid) || !seenIds.Add(nid)) continue;

                        var name = item.TryGetProperty("name", out var nameE) ? nameE.GetString() : null;
                        if (string.IsNullOrWhiteSpace(name)) continue;

                        // price — "price" field (saaf number string)
                        decimal price = 0;
                        if (item.TryGetProperty("price", out var priceE))
                            decimal.TryParse(priceE.GetString(), out price);
                        if (price <= 0) continue;

                        // image
                        var image = item.TryGetProperty("image", out var imgE) ? imgE.GetString() : null;

                        // product URL — Daraz "//www.daraz.pk/products/..." deta hai
                        string productUrl = $"https://www.daraz.pk/products/-i{nid}.html";
                        if (item.TryGetProperty("productUrl", out var urlE))
                        {
                            var u = urlE.GetString();
                            if (!string.IsNullOrWhiteSpace(u))
                                productUrl = u.StartsWith("//") ? "https:" + u : u;
                        }

                        var mappedCategory = CategoryMapper.Map(name, null, category);

                        existingByUrl.TryGetValue(productUrl, out var existing);

                        if (existing is null)
                        {
                            if (mappedCategory == "other") continue;

                            db.StoreListings.Add(new StoreListing
                            {
                                StoreId    = daraz.Id,
                                RawTitle   = name.Length > 500 ? name[..500] : name,
                                Price      = price,
                                InStock    = true,
                                ProductUrl = productUrl,
                                ImageUrl   = image,
                                Category   = mappedCategory,
                                ScrapedAt  = DateTimeOffset.UtcNow
                            });
                        }
                        else
                        {
                            if (existing.Price != price)
                            {
                                db.PriceHistory.Add(new PriceHistoryPoint
                                {
                                    StoreListingId = existing.Id,
                                    Price          = existing.Price,
                                    RecordedAt     = DateTimeOffset.UtcNow
                                });
                                existing.Price = price;
                            }
                            existing.Category  = mappedCategory;
                            existing.ScrapedAt = DateTimeOffset.UtcNow;
                        }

                        totalSaved++;
                        freshThisPage++;
                    }

                    try
                    {
                        await db.SaveChangesAsync();
                        _logger.LogInformation("  Page {Page}: {Fresh} products. Total: {Total}",
                            page, freshThisPage, totalSaved);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "  Page {Page} SAVE mein masla", page);
                    }

                    await Task.Delay(1500);  // block se bachao
                }

                await Task.Delay(2500);  // har term ke beech
            }

            _logger.LogInformation("Daraz sync mukammal. Total: {Count}", totalSaved);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Daraz sync mein bara masla");
        }
    }
}
