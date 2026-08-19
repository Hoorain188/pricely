using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PriceCompare.Api.Data;
using PriceCompare.Api.Models;

namespace PriceCompare.Api.Services;

public class TelemartSyncService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IServiceProvider _services;
    private readonly ILogger<TelemartSyncService> _logger;

    public TelemartSyncService(
        IHttpClientFactory httpFactory,
        IServiceProvider services,
        ILogger<TelemartSyncService> logger)
    {
        _httpFactory = httpFactory;
        _services = services;
        _logger = logger;
    }

    // 10 categories: mobiles_tablets, laptops_computers, tv_entertainment,
    // home_appliances, kitchen_appliances, cameras, audio, wearables, gaming, accessories
    private static string MapCategory(string? productType, string title, List<string> tags)
    {
        var pt = (productType ?? "").ToLower();
        var t  = (pt + " " + title + " " + string.Join(" ", tags)).ToLower();

        // ---- Skip karne wali cheezein (medicine, beauty, fashion, hassaas) ----
        if (t.Contains("viga") || t.Contains("sildenafil") || t.Contains("long time spray") ||
            t.Contains("timing spray") || t.Contains("delay spray") || t.Contains("condom") ||
            t.Contains("erection") || t.Contains("libido") ||
            (t.Contains("tablet") && (t.Contains("mg") || t.Contains(" tablets)") ||
                t.Contains("30 tablets") || t.Contains("20 tablets") || t.Contains("15 tablets"))) ||
            t.Contains("capsules") || t.Contains("syrup") || t.Contains("multivitamin") ||
            t.Contains("supplement") || t.Contains("herbiotics") || t.Contains("nutrifactor") ||
            t.Contains("health aid") || t.Contains("ointment") || t.Contains("medicine") ||
            t.Contains("protein powder") || t.Contains("whey") || t.Contains("fish oil") ||
            t.Contains("perfume") || t.Contains("fragrance") || t.Contains("body mist") ||
            t.Contains("lipstick") || t.Contains("mascara") || t.Contains("foundation") ||
            t.Contains("makeup") || t.Contains("compact powder") || t.Contains("bronzer") ||
            t.Contains("shampoo") || t.Contains("skincare") || t.Contains("nail polish") ||
            t.Contains("bra ") || t.Contains("bra set") || t.Contains("lingerie") ||
            t.Contains("babydoll") || t.Contains("kurta") || t.Contains("shoe") ||
            t.Contains("sneaker") || t.Contains("sandal") || t.Contains("slipper"))
            return "other";

        // ---- WEARABLES (sab se pehle — warna smartwatch mobile ban jaye) ----
        if (t.Contains("smart watch") || t.Contains("smartwatch") || t.Contains("fitness band") ||
            t.Contains("smart band") || t.Contains("mi band") || t.Contains("apple watch") ||
            t.Contains("galaxy watch") || t.Contains("fitness tracker") || t.Contains("watch"))
            return "wearables";

        // ---- AUDIO ----
        if (t.Contains("airpod") || t.Contains("earbud") || t.Contains("earphone") ||
            t.Contains("headphone") || t.Contains("handsfree") || t.Contains("speaker") ||
            t.Contains("buds") || t.Contains("soundbar") || t.Contains("home theater") ||
            t.Contains("home theatre") || t.Contains("microphone"))
            return "audio";

        // ---- ACCESSORIES (chargers, cables, covers, power banks) ----
        if (t.Contains("charger") || t.Contains("cable") || t.Contains("adapter") ||
            t.Contains("case") || t.Contains("cover") || t.Contains("screen protector") ||
            t.Contains("tempered") || t.Contains("power bank") || t.Contains("powerbank") ||
            t.Contains("phone holder") || t.Contains("phone stand") || t.Contains("stylus") ||
            t.Contains("card reader") || t.Contains("usb hub") || t.Contains("selfie stick") ||
            t.Contains("mousepad") || t.Contains("cooling pad") || t.Contains("laptop bag") ||
            t.Contains("laptop stand"))
            return "accessories";

        // ---- GAMING ----
        if (t.Contains("playstation") || t.Contains("ps5") || t.Contains("ps4") ||
            t.Contains("xbox") || t.Contains("nintendo") || t.Contains("gaming console") ||
            t.Contains("game controller") || t.Contains("gamepad") || t.Contains("joystick") ||
            t.Contains("dualsense"))
            return "gaming";

        // ---- CAMERAS & ACCESSORIES ----
        if (t.Contains("dslr") || t.Contains("mirrorless") || t.Contains("camera") ||
            t.Contains("gopro") || t.Contains("camera lens") || t.Contains("tripod") ||
            t.Contains("drone") || t.Contains("memory card") || t.Contains("camera bag"))
            return "cameras";

        // ---- TVs & HOME ENTERTAINMENT ----
        if (t.Contains("led tv") || t.Contains("smart tv") || t.Contains("television") ||
            t.Contains("projector") || t.Contains("tv stick") || t.Contains("android box") ||
            pt.Contains("tv"))
            return "tv_entertainment";

        // ---- KITCHEN APPLIANCES ----
        if (t.Contains("blender") || t.Contains("air fryer") || t.Contains("toaster") ||
            t.Contains("juicer") || t.Contains("grinder") || t.Contains("food processor") ||
            t.Contains("coffee maker") || t.Contains("espresso") || t.Contains("kettle") ||
            t.Contains("deep fryer") || t.Contains("sandwich maker") || t.Contains("oven") ||
            t.Contains("chopper") || t.Contains("rice cooker") || t.Contains("hot plate"))
            return "kitchen_appliances";

        // ---- HOME APPLIANCES ----
        if (t.Contains("refrigerator") || t.Contains("fridge") || t.Contains("freezer") ||
            t.Contains("washing machine") || t.Contains("air conditioner") ||
            t.Contains("split ac") || t.Contains("inverter ac") || t.Contains("microwave") ||
            t.Contains("vacuum") || t.Contains("water dispenser") || t.Contains("geyser") ||
            t.Contains("heater") || t.Contains("iron") || t.Contains("air cooler") ||
            t.Contains("dryer") || t.Contains("ceiling fan") || t.Contains("pedestal fan"))
            return "home_appliances";

        // ---- MOBILES & TABLETS ----
        if (t.Contains("iphone") || t.Contains("smartphone") || t.Contains("smart phone") ||
            t.Contains("feature phone") || t.Contains("mobile phone") || t.Contains("ipad") ||
            t.Contains("galaxy tab") || t.Contains("kindle") || t.Contains("surface pro") ||
            pt == "tablet" || pt is "mobile" or "smartphone" or "feature phone" or "smart phone" ||
            t.Contains("redmi") || t.Contains("infinix") || t.Contains("tecno") ||
            t.Contains("vivo ") || t.Contains("oppo") || t.Contains("realme") ||
            t.Contains("nokia") || t.Contains("itel") || t.Contains("pixel") ||
            t.Contains("samsung galaxy s") || t.Contains("samsung galaxy a") ||
            t.Contains("samsung galaxy z"))
            return "mobiles_tablets";

        // ---- LAPTOPS & COMPUTERS (monitor, printer, mouse, keyboard bhi) ----
        if (t.Contains("laptop") || t.Contains("notebook") || t.Contains("macbook") ||
            t.Contains("chromebook") || t.Contains("desktop") || t.Contains("imac") ||
            t.Contains("monitor") || t.Contains("printer") || t.Contains("scanner") ||
            t.Contains("mouse") || t.Contains("keyboard") || t.Contains("ssd") ||
            t.Contains("hard drive") || t.Contains(" ram ") || t.Contains("ups") ||
            t.Contains("toner") || t.Contains("cartridge") || t.Contains("flash drive") ||
            t.Contains("graphic card") || t.Contains("processor"))
            return "laptops_computers";

        return "other";
    }

    public async Task SyncAllProductsAsync()
    {
        try
        {
            _logger.LogInformation("Telemart catalog sync shuru...");

            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var telemart = await RetryAsync(() => db.Stores.FirstOrDefaultAsync(s => s.Slug == "telemart"));
            if (telemart is null)
            {
                _logger.LogWarning("Telemart store DB mein nahi. Sync ruk gaya.");
                return;
            }

            // Reuse the row the admin panel opened, so pressing Run does not
            // leave a second one behind. Recurring runs open their own.
            var run = await db.ScraperRuns
                .Where(r => r.StoreId == telemart.Id && r.FinishedAt == null)
                .OrderByDescending(r => r.StartedAt)
                .FirstOrDefaultAsync();

            var http = _httpFactory.CreateClient();
            http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

            int page = 1;
            int totalSaved = 0;
            int skipped = 0;

            while (true)
            {
                var url = $"https://www.telemart.pk/products.json?limit=250&page={page}";

                List<JsonElement> products;
                try
                {
                    var json = await http.GetStringAsync(url);
                    using var doc = JsonDocument.Parse(json);
                    products = doc.RootElement.GetProperty("products")
                                   .EnumerateArray()
                                   .Select(e => e.Clone())
                                   .ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Page {Page} laane mein masla", page);
                    break;
                }

                if (products.Count == 0)
                {
                    _logger.LogInformation("Catalog khatam. Total pages: {Pages}", page - 1);
                    break;
                }

                foreach (var p in products)
                {
                    try
                    {
                        var title  = p.GetProperty("title").GetString() ?? "";
                        var handle = p.TryGetProperty("handle", out var h) ? h.GetString() : "";
                        var productType = p.TryGetProperty("product_type", out var ptE) ? ptE.GetString() : "";
                        var productUrl = $"https://www.telemart.pk/products/{handle}";

                        var tagList = new List<string>();
                        if (p.TryGetProperty("tags", out var tagsE) && tagsE.ValueKind == JsonValueKind.Array)
                            foreach (var tg in tagsE.EnumerateArray())
                                if (tg.GetString() is string s) tagList.Add(s);

                        var category = MapCategory(productType, title, tagList);

                        // Sirf 10 zaroori categories DB mein — baaki skip (bojh na pade)
                        if (category == "other")
                        {
                            skipped++;
                            continue;
                        }

                        string? image = null;
                        if (p.TryGetProperty("images", out var imgs) && imgs.GetArrayLength() > 0)
                            if (imgs[0].TryGetProperty("src", out var src))
                                image = src.GetString();

                        decimal price = 0;
                        if (p.TryGetProperty("variants", out var vars) && vars.GetArrayLength() > 0)
                            if (vars[0].TryGetProperty("price", out var pr))
                                decimal.TryParse(pr.GetString(), out price);

                        if (price <= 0 || string.IsNullOrWhiteSpace(handle))
                        {
                            skipped++;
                            continue;
                        }

                        var existing = await RetryAsync(() =>
                            db.StoreListings.FirstOrDefaultAsync(l => l.StoreId == telemart.Id && l.ProductUrl == productUrl));

                        if (existing is null)
                        {
                            db.StoreListings.Add(new StoreListing
                            {
                                StoreId    = telemart.Id,
                                RawTitle   = title.Length > 500 ? title[..500] : title,
                                Price      = price,
                                InStock    = true,
                                ProductUrl = productUrl,
                                ImageUrl   = image,
                                Category   = category,
                                ScrapedAt  = DateTime.UtcNow
                            });
                        }
                        else
                        {
                            if (existing.Price != price)
                            {
                                db.PriceHistories.Add(new PriceHistory
                                {
                                    StoreListingId = existing.Id,
                                    Price          = existing.Price,
                                    RecordedAt     = DateTime.UtcNow
                                });
                                existing.Price = price;
                            }
                            existing.Category  = category;
                            existing.ScrapedAt = DateTime.UtcNow;
                        }

                        totalSaved++;
                    }
                    catch (Exception ex)
                    {
                        skipped++;
                        _logger.LogWarning(ex, "Product skip hua (transient failure)");
                    }
                }

                try
                {
                    await RetryAsync(async () => { await db.SaveChangesAsync(); return true; });
                    _logger.LogInformation("Page {Page} done. Saved: {Count}, Skipped: {Skip}", page, totalSaved, skipped);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Page {Page} SAVE mein masla — skipping page", page);
                    // DB context may be corrupted, recreate it
                    db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                }

                page++;
                await Task.Delay(2000); // Cloud DB ko breathing room
            }

            _logger.LogInformation("Sync mukammal. Total: {Count}, Skipped: {Skip}", totalSaved, skipped);
            // Close the run so the dashboard stops saying "running". A fresh
            // context: the loop above may have replaced db after a failed save.
            using (var cs = _services.CreateScope())
            {
                var cdb = cs.ServiceProvider.GetRequiredService<AppDbContext>();
                var open = run is null ? null : await cdb.ScraperRuns.FirstOrDefaultAsync(r => r.Id == run.Id);
                if (open is not null)
                {
                    open.ItemsScraped = totalSaved;
                    open.FinishedAt   = DateTime.UtcNow;
                    await cdb.SaveChangesAsync();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sync mein bara masla");

            // A crashed run must still be closed, or the button stays disabled.
            try
            {
                using var fs = _services.CreateScope();
                var fdb = fs.ServiceProvider.GetRequiredService<AppDbContext>();
                var stillOpen = await fdb.ScraperRuns
                    .Where(r => r.FinishedAt == null)
                    .OrderByDescending(r => r.StartedAt)
                    .FirstOrDefaultAsync();
                if (stillOpen is not null)
                {
                    stillOpen.ErrorMessage = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
                    stillOpen.FinishedAt   = DateTime.UtcNow;
                    await fdb.SaveChangesAsync();
                }
            }
            catch (Exception ce) { _logger.LogError(ce, "Run row band nahi ho saki"); }
        }
    }

    // Retry helper for transient DB failures (up to 3 attempts with exponential backoff)
    private async Task<T?> RetryAsync<T>(Func<Task<T?>> action, int maxRetries = 3)
    {
        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                return await action();
            }
            catch (Exception ex) when (attempt < maxRetries &&
                (ex is InvalidOperationException || ex.InnerException is System.Net.Sockets.SocketException
                 || ex.InnerException is IOException))
            {
                _logger.LogWarning("DB retry {Attempt}/{Max} — {Msg}", attempt, maxRetries, ex.Message);
                await Task.Delay(attempt * 2000); // 2s, 4s, 6s
            }
        }
        return default;
    }
}