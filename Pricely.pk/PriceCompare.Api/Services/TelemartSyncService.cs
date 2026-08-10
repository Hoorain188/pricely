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

    // product_type + title + tags teeno dekh kar app ki category deta hai
    private static string MapCategory(string? productType, string title, List<string> tags)
    {
        var pt = (productType ?? "").ToLower();
        var t  = (pt + " " + title + " " + string.Join(" ", tags)).ToLower();

        // ---- Hassaas + Medicine — 'other' mein rakho (app mein na dikhein) ----
        if (t.Contains("viga") || t.Contains("sildenafil") || t.Contains("long time spray") ||
            t.Contains("timing spray") || t.Contains("delay spray") || t.Contains("sex") ||
            t.Contains("condom") || t.Contains("erection") || t.Contains("libido") ||
            // medicines / supplements
            (t.Contains("tablet") && (t.Contains("mg") || t.Contains("capsule") || t.Contains("30 tablets") ||
                t.Contains("20 tablets") || t.Contains("15 tablets") || t.Contains("10 tablets"))) ||
            t.Contains("capsules") || t.Contains("syrup") || t.Contains("multivitamin") ||
            t.Contains("vitamin") || t.Contains("supplement") || t.Contains("herbiotics") ||
            t.Contains("nutrifactor") || t.Contains("health aid") || t.Contains("sachet") ||
            t.Contains("ointment") || t.Contains("medicine") || t.Contains("painkiller") ||
            t.Contains("antibiotic") || t.Contains("probiotic") || t.Contains("protein powder") ||
            t.Contains("whey") || t.Contains("collagen") || t.Contains("omega 3") ||
            t.Contains("fish oil") || (t.Contains("glucose") && t.Contains("powder")))
            return "other";

        // ---- Accessories PEHLE (warna "iphone cover" mobile ban jaye) ----
        if (t.Contains("case") || t.Contains("cover") || t.Contains("screen protector") ||
            t.Contains("tempered") || t.Contains("data cable") || t.Contains("charging cable") ||
            t.Contains("charger") || t.Contains("adapter") || t.Contains("mouse") ||
            t.Contains("keyboard") || t.Contains("laptop bag") || t.Contains("laptop stand") ||
            t.Contains("stylus") || t.Contains("card reader") || t.Contains("usb hub") ||
            t.Contains("mousepad") || t.Contains("cooling pad"))
            return "accessories";

        // ---- Audio ----
        if (t.Contains("airpod") || t.Contains("earbud") || t.Contains("earphone") ||
            t.Contains("headphone") || t.Contains("handsfree") || t.Contains("speaker") ||
            t.Contains("microphone") || t.Contains("buds") || t.Contains("soundbar") ||
            t.Contains("home theater") || t.Contains("home theatre"))
            return "audio";

        // ---- Power bank ----
        if (t.Contains("power bank") || t.Contains("powerbank"))
            return "power_banks";

        // ---- Gaming ----
        if (t.Contains("gaming console") || t.Contains("playstation") || t.Contains("ps5") ||
            t.Contains("ps4") || t.Contains("xbox") || t.Contains("nintendo") ||
            t.Contains("game controller") || t.Contains("gamepad") || t.Contains("joystick"))
            return "gaming";

        // ---- Projector ----
        if (t.Contains("projector"))
            return "projectors";

        // ---- iPhones (Apple phones) ----
        if (t.Contains("iphone") ||
            (t.Contains("apple") && (t.Contains("phone") || pt.Contains("phone"))))
            return "iphones";

        // ---- Mobiles (baaki phones) ----
        if (t.Contains("smartphone") || t.Contains("feature phone") ||
            t.Contains("android phone") || t.Contains("mobile phone") ||
            pt is "mobile" or "smartphone" or "feature phone" or "smart phone" ||
            t.Contains("samsung galaxy") || t.Contains("redmi") || t.Contains("infinix") ||
            t.Contains("tecno") || t.Contains("vivo") || t.Contains("oppo") ||
            t.Contains("realme") || t.Contains("nokia") || t.Contains("itel") ||
            t.Contains("pixel"))
            return "mobiles";

        // ---- Tablets (gadget — dawai wali "tablet" NAHI) ----
        if (pt == "tablet" || t.Contains("ipad") || t.Contains("galaxy tab") ||
            t.Contains("kindle") || t.Contains("surface pro") ||
            (t.Contains("tablet") && (t.Contains("inch") || t.Contains("ram") || t.Contains("wifi"))))
            return "tablets";

        // ---- Laptops ----
        if (t.Contains("laptop") || t.Contains("notebook") || t.Contains("macbook") ||
            t.Contains("chromebook"))
            return "laptops";

        // ---- Watches ----
        if (t.Contains("smart watch") || t.Contains("smartwatch") || t.Contains("watch"))
            return "watches";

        // ---- Cameras ----
        if (t.Contains("dslr") || t.Contains("mirrorless") || t.Contains("camera") ||
            t.Contains("gopro") || t.Contains("camera lens"))
            return "cameras";

        // ---- Monitors ----
        if (t.Contains("monitor"))
            return "monitors";

        // ---- Printers ----
        if (t.Contains("printer") || t.Contains("toner") || t.Contains("cartridge") ||
            t.Contains("scanner"))
            return "printers";

        // ---- Televisions ----
        if (t.Contains("led tv") || t.Contains("television") || t.Contains("smart tv") ||
            pt.Contains("tv"))
            return "televisions";

        // ---- Appliances ----
        if (t.Contains("air conditioner") || t.Contains("split ac") || t.Contains("inverter ac") || t.Contains(" dc ac"))
            return "air_conditioners";

        if (t.Contains("refrigerator") || t.Contains("fridge") || t.Contains("freezer") || t.Contains("deep freezer"))
            return "fridge";

        if (t.Contains("washing machine") || t.Contains("washer") || t.Contains("dryer"))
            return "washing_machine";

        if (t.Contains("microwave") || t.Contains("oven"))
            return "microwave";

        if (t.Contains("fan") || t.Contains("ceiling fan") || t.Contains("pedestal fan"))
            return "fans";

        if (t.Contains("iron") || t.Contains("blender") || t.Contains("grinder") ||
            t.Contains("kettle") || t.Contains("vacuum") || t.Contains("heater") ||
            t.Contains("geyser") || t.Contains("water dispenser") ||
            t.Contains("food processor") || t.Contains("air fryer") || t.Contains("deep fryer") ||
            t.Contains("coffee maker") || t.Contains("juicer") || t.Contains("toaster") ||
            t.Contains("scale") || t.Contains("blood glucose") || t.Contains("blood pressure") ||
            t.Contains("thermometer") || t.Contains("nebulizer") || t.Contains("appliance"))
            return "appliances";

        // ---- Beauty ----
        if (t.Contains("skincare") || t.Contains("serum") || t.Contains("moisturizer") ||
            t.Contains("sunscreen") || t.Contains("face wash") || t.Contains("cleanser") ||
            t.Contains("lotion") || t.Contains("night cream"))
            return "skincare";

        if (t.Contains("makeup") || t.Contains("lipstick") || t.Contains("mascara") ||
            t.Contains("foundation") || t.Contains("compact powder") || t.Contains("bronzer") ||
            t.Contains("concealer") || t.Contains("eyeliner") || t.Contains("palette") ||
            t.Contains("cosmetic") || t.Contains("blush") || t.Contains("lip gloss"))
            return "makeup";

        if (t.Contains("perfume") || t.Contains("fragrance") || t.Contains("body mist") ||
            t.Contains("eau de parfum") || t.Contains("cologne") || t.Contains("attar"))
            return "fragrances";

        if (t.Contains("beauty") || t.Contains("nail polish") || t.Contains("haircare") ||
            t.Contains("shampoo") || t.Contains("conditioner"))
            return "beauty";

        // ---- Fashion ----
        if (t.Contains("shoe") || t.Contains("sneaker") || t.Contains("slipper") ||
            t.Contains("sandal") || t.Contains("flip flop") || t.Contains("boot") ||
            t.Contains("footwear"))
            return "footwear";

        if (t.Contains("kurta") || t.Contains("suit") || t.Contains("dress") ||
            t.Contains("lawn") || t.Contains("kurti") || t.Contains("dupatta") ||
            t.Contains("handbag") || t.Contains("purse") || t.Contains("abaya"))
            return "womenswear";

        if (t.Contains("shirt") || t.Contains("jeans") || t.Contains("pant") ||
            t.Contains("t-shirt") || t.Contains("jacket") || t.Contains("hoodie") ||
            t.Contains("trouser") || t.Contains("clothing") || t.Contains("apparel") ||
            t.Contains("wallet") || t.Contains("belt") || t.Contains("sunglasses") ||
            t.Contains("jewelry") || t.Contains("jewellery"))
            return "menswear";

        // ---- Home & Living ----
        if (t.Contains("sofa") || t.Contains("chair") || t.Contains("table") ||
            t.Contains("bed") || t.Contains("mattress") || t.Contains("cupboard") ||
            t.Contains("furniture"))
            return "furniture";

        if (t.Contains("kitchenware") || t.Contains("cookware") || t.Contains("utensil") ||
            t.Contains("cutlery") || t.Contains("pan") || t.Contains("pot") || t.Contains("dinner set"))
            return "kitchenware";

        if (t.Contains("bedding") || t.Contains("pillow") || t.Contains("blanket") ||
            t.Contains("bedsheet") || t.Contains("towel") || t.Contains("quilt"))
            return "bedding";

        if (t.Contains("lighting") || t.Contains("lamp") || t.Contains("light bulb") ||
            t.Contains("chandelier") || t.Contains("ceiling light"))
            return "lighting";

        if (t.Contains("home decor") || t.Contains("clock") || t.Contains("vase") ||
            t.Contains("curtain") || t.Contains("rug") || t.Contains("carpet") || t.Contains("home"))
            return "home";

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

                        string? image = null;
                        if (p.TryGetProperty("images", out var imgs) && imgs.GetArrayLength() > 0)
                            if (imgs[0].TryGetProperty("src", out var src))
                                image = src.GetString();

                        decimal price = 0;
                        if (p.TryGetProperty("variants", out var vars) && vars.GetArrayLength() > 0)
                            if (vars[0].TryGetProperty("price", out var pr))
                                decimal.TryParse(pr.GetString(), out price);

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
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sync mein bara masla");
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