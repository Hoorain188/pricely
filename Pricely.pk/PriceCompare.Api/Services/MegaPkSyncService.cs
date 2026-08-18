using AngleSharp;
using AngleSharp.Dom;
using Microsoft.EntityFrameworkCore;
using PriceCompare.Api.Data;
using PriceCompare.Api.Models;

namespace PriceCompare.Api.Services;

public class MegaPkSyncService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IServiceProvider _services;
    private readonly ILogger<MegaPkSyncService> _logger;

    // Mega.pk ki saari main categories. Naye add karne ho to yahan ek line barha dein.
    // Slug wohi hai jo URL mein aata hai: https://www.mega.pk/<slug>/
    private static readonly (string Slug, string Category)[] Categories = new[]
    {
        // --- Mobiles & Tablets ---
        ("mobiles",               "mobiles_tablets"),
        ("multimediatablets",     "mobiles_tablets"),

        // --- Laptops & Computers ---
        ("laptop-price-pakistan", "laptops_computers"),
        ("desktopcomputers",      "laptops_computers"),
        ("lcdledmonitor",         "laptops_computers"),
        ("printer",               "laptops_computers"),
        ("inkjetprinters",        "laptops_computers"),
        ("multifunctionprinters", "laptops_computers"),
        ("scanner",               "laptops_computers"),
        ("externalhards",         "laptops_computers"),
        ("internalhards",         "laptops_computers"),
        ("laptopram",             "laptops_computers"),
        ("desktopram",            "laptops_computers"),
        ("desktopgraphiccards",   "laptops_computers"),
        ("desktopprocessors",     "laptops_computers"),
        ("computercasing",        "laptops_computers"),
        ("ups",                   "laptops_computers"),

        // --- TVs & Home Entertainment ---
        ("ledtv",                 "tv_entertainment"),
        ("projector",             "tv_entertainment"),
        ("hometheater",           "tv_entertainment"),
        ("DVDandBlurayPlayers",   "tv_entertainment"),

        // --- Home Appliances ---
        ("airconditioners",       "home_appliances"),
        ("fridge",                "home_appliances"),
        ("freezer",               "home_appliances"),
        ("washingmachine",        "home_appliances"),
        ("microwaveovens",        "home_appliances"),
        ("vacuumcleaners",        "home_appliances"),
        ("Irons",                 "home_appliances"),
        ("fans",                  "home_appliances"),
        ("heaters",               "home_appliances"),
        ("geyser",                "home_appliances"),

        // --- Kitchen Appliances ---
        ("blendersgrinders",      "kitchen_appliances"),
        ("kettles",               "kitchen_appliances"),
        ("coffeemaker",           "kitchen_appliances"),
        ("foodprocessors",        "kitchen_appliances"),
        ("deepfryer",             "kitchen_appliances"),

        // --- Cameras & Accessories ---
        ("DSLRcameras",           "cameras"),
        ("digitalcameras",        "cameras"),
        ("mirrorlesscameras",     "cameras"),
        ("drone",                 "cameras"),
        ("lenses",                "cameras"),
        ("camerasmemorycards",    "cameras"),
        ("tripod",                "cameras"),
        ("bagscases",             "cameras"),
        ("lightsstudio",          "cameras"),
        ("camerasaccessories",    "cameras"),

        // --- Audio ---
        ("headphones",            "audio"),
        ("mobilespeakers",        "audio"),
        ("mobileheadphones",      "audio"),
        ("bluetoothhandfree",     "audio"),
        ("dockingStationsSpeakers","audio"),
        ("hifisystem",            "audio"),
        ("MP3andMP4players",      "audio"),

        // --- Wearables ---
        ("watches",               "wearables"),

        // --- Gaming ---
        ("gamingconsoles",        "gaming"),

        // --- Accessories ---
        ("powerbank",             "accessories"),
        ("mobilecharger",         "accessories"),
        ("mobilecables",          "accessories"),
        ("mobileotheracc",        "accessories"),
        ("laptopcharger",         "accessories"),
        ("laptopbattries",        "accessories"),
        ("laptopbag",             "accessories"),
        ("laptopkeyboard",        "accessories"),
        ("mouse",                 "accessories"),
        ("laptopotheraccessories","accessories"),
        ("webcameras",            "accessories"),
        ("flashdrive",            "accessories"),
        ("tabletchargers",        "accessories"),
        ("tabletkeyboards",       "accessories"),
        ("tabletcovers",          "accessories"),
        ("tabletscreenprotector", "accessories"),
        ("tabletcables",          "accessories"),
        ("tonersandcartridges",   "accessories"),
    };

    private const string BaseHost = "https://www.mega.pk";

    // Pagination: itne pages tak koshish. Content khatam hote hi khud ruk jayega.
    private const int MaxPagesPerCategory = 60;

    // Ek page mein saare products hote hain, isliye per-page ek hi request.
    // Politeness delays:
    private const int DelayBetweenPagesMs      = 1500;
    private const int DelayBetweenCategoriesMs = 3000;

    // Agar lagataar itne pages khali/fail aaye, category chhor do (block ya galat slug)
    private const int MaxConsecutivePageFails = 3;

    public MegaPkSyncService(
        IHttpClientFactory httpFactory,
        IServiceProvider services,
        ILogger<MegaPkSyncService> logger)
    {
        _httpFactory = httpFactory;
        _services = services;
        _logger = logger;
    }

    public async Task SyncAllProductsAsync()
    {
        try
        {
            _logger.LogInformation("Mega.pk FULL sync (HTML-grid) shuru...");

            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var megapk = await RetryAsync(() => db.Stores.FirstOrDefaultAsync(s => s.Slug == "megapk"));
            if (megapk is null)
            {
                _logger.LogWarning("Mega.pk store DB mein nahi. Sync ruk gaya.");
                return;
            }

            // Reuse the row the admin panel opened, so pressing Run does not
            // leave a second one behind. Recurring runs open their own.
            var run = await db.ScraperRuns
                .Where(r => r.StoreId == megapk.Id && r.FinishedAt == null)
                .OrderByDescending(r => r.StartedAt)
                .FirstOrDefaultAsync();

            var http = _httpFactory.CreateClient();
            http.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            http.Timeout = TimeSpan.FromSeconds(25);

            // AngleSharp ek hi context reuse karega
            var browsing = BrowsingContext.New(Configuration.Default);

            int totalNew = 0, totalUpdated = 0;

            foreach (var (slug, category) in Categories)
            {
                _logger.LogInformation("=== Category: {Cat} ({Slug}) ===", category, slug);

                var seenUrls = new HashSet<string>();
                string? prevPageFingerprint = null;
                int consecutiveFails = 0;
                int catNew = 0, catUpdated = 0;

                for (int page = 1; page <= MaxPagesPerCategory; page++)
                {
                    var pageUrl = page == 1
                        ? $"{BaseHost}/{slug}/"
                        : $"{BaseHost}/{slug}/{page}/";

                    string? html = await SafeFetch(http, pageUrl);
                    if (html is null)
                    {
                        consecutiveFails++;
                        _logger.LogWarning("  Page {Page}: fetch fail ({F}/{M})",
                            page, consecutiveFails, MaxConsecutivePageFails);
                        if (consecutiveFails >= MaxConsecutivePageFails) break;
                        await Task.Delay(DelayBetweenPagesMs);
                        continue;
                    }

                    var products = await ExtractProductList(browsing, html);

                    if (products.Count == 0)
                    {
                        // khali page = category khatam
                        _logger.LogInformation("  Page {Page}: 0 products — category khatam.", page);
                        break;
                    }

                    // Wahi page dobara aaya (out-of-range par mega aakhri page repeat karta hai)?
                    var fingerprint = string.Join("|",
                        products.Select(p => p.Url).OrderBy(u => u, StringComparer.Ordinal));
                    if (fingerprint == prevPageFingerprint)
                    {
                        _logger.LogInformation("  Page {Page}: pichla page repeat — category khatam.", page);
                        break;
                    }
                    prevPageFingerprint = fingerprint;

                    var fresh = products.Where(p => seenUrls.Add(p.Url)).ToList();
                    if (fresh.Count == 0)
                    {
                        _logger.LogInformation("  Page {Page}: sab dekhe hue — category khatam.", page);
                        break;
                    }

                    consecutiveFails = 0;

                    // --- BATCHED UPSERT (ek query se sab existing laayein, per-item nahi) ---
                    var urls = fresh.Select(f => f.Url).ToList();
                    var existingMap = await RetryAsync(() => db.StoreListings
                        .Where(l => l.StoreId == megapk.Id && urls.Contains(l.ProductUrl))
                        .ToDictionaryAsync(l => l.ProductUrl!)) ?? new Dictionary<string, StoreListing>();

                    foreach (var item in fresh)
                    {
                        if (existingMap.TryGetValue(item.Url, out var existing))
                        {
                            if (item.Price > 0 && existing.Price != item.Price)
                            {
                                db.PriceHistories.Add(new PriceHistory
                                {
                                    StoreListingId = existing.Id,
                                    Price          = existing.Price,
                                    RecordedAt     = DateTime.UtcNow
                                });
                                existing.Price = item.Price;
                            }
                            existing.RawTitle  = Trim500(item.Name);
                            existing.ImageUrl  = item.Image;
                            existing.Category  = category;
                            existing.InStock   = item.Price > 0;
                            existing.ScrapedAt = DateTime.UtcNow;
                            catUpdated++; totalUpdated++;
                        }
                        else
                        {
                            db.StoreListings.Add(new StoreListing
                            {
                                StoreId    = megapk.Id,
                                RawTitle   = Trim500(item.Name),
                                Price      = item.Price,
                                InStock    = item.Price > 0,
                                ProductUrl = item.Url,
                                ImageUrl   = item.Image,
                                Category   = category,
                                ScrapedAt  = DateTime.UtcNow
                            });
                            catNew++; totalNew++;
                        }
                    }

                    try
                    {
                        await RetryAsync(async () => { await db.SaveChangesAsync(); return true; });
                        db.ChangeTracker.Clear(); // memory saaf, warna hazaaron rows track hoti rehti hain
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "  Page {Page} SAVE fail — inner: {Msg}",
                            page, ex.InnerException?.Message);
                        db.ChangeTracker.Clear();
                    }

                    _logger.LogInformation("  Page {Page}: +{New} new, ~{Upd} updated (cat total seen {Seen})",
                        page, catNew, catUpdated, seenUrls.Count);

                    await Task.Delay(DelayBetweenPagesMs);
                }

                _logger.LogInformation("--- {Cat} done: {New} new, {Upd} updated ---",
                    category, catNew, catUpdated);
                await Task.Delay(DelayBetweenCategoriesMs);
            }

            _logger.LogInformation("Mega.pk FULL sync mukammal. Total {New} new, {Upd} updated.",
                totalNew, totalUpdated);

            // Close the run so the dashboard stops saying "running".
            using (var cs = _services.CreateScope())
            {
                var cdb = cs.ServiceProvider.GetRequiredService<AppDbContext>();
                var open = run is null ? null : await cdb.ScraperRuns.FirstOrDefaultAsync(r => r.Id == run.Id);
                if (open is not null)
                {
                    open.FinishedAt = DateTime.UtcNow;
                    await cdb.SaveChangesAsync();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Mega.pk sync mein bara masla");

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

    private async Task<string?> SafeFetch(HttpClient http, string url, int retries = 2)
    {
        for (int attempt = 0; attempt <= retries; attempt++)
        {
            try
            {
                var resp = await http.GetAsync(url);
                if (resp.IsSuccessStatusCode)
                    return await resp.Content.ReadAsStringAsync();

                if (resp.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return null; // page range khatam

                _logger.LogWarning("  {Url} → {Code}", url, (int)resp.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "  fetch error {Url} (try {A})", url, attempt + 1);
            }
            await Task.Delay(2000 * (attempt + 1));
        }
        return null;
    }

    // =========================================================================
    //  Mega.pk ka asal product card:  <li> ... <div class="lap_thu_box"> ...
    //  Naam:  #lap_name_div h3 a   |   Price: .cat_price (magar .was chhod kar)
    //  Link/Image: .image a[href] / img src
    // =========================================================================
    private async Task<List<(string Name, string Url, decimal Price, string? Image)>>
        ExtractProductList(IBrowsingContext browsing, string html)
    {
        var result = new List<(string, string, decimal, string?)>();

        var doc = await browsing.OpenAsync(req => req.Content(html));

        // Har product ek lap_thu_box hai. (Sirf item_grid ke andar wale lein
        // taake brand tiles / "similar" boxes na aa jayein.)
        var cards = doc.QuerySelectorAll("ul.item_grid li .lap_thu_box");

        // fallback agar upar wala class kabhi na mile
        if (cards.Length == 0)
            cards = doc.QuerySelectorAll(".lap_thu_box");

        foreach (var card in cards)
        {
            // --- Naam + link: #lap_name_div h3 a ---
            var nameAnchor = card.QuerySelector("#lap_name_div h3 a")
                          ?? card.QuerySelector("h3 a");
            var href = nameAnchor?.GetAttribute("href");
            if (string.IsNullOrWhiteSpace(href)) continue;

            var url = href.StartsWith("http") ? href : $"{BaseHost}/{href.TrimStart('/')}";

            var name = nameAnchor?.TextContent?.Trim();
            if (string.IsNullOrWhiteSpace(name)) continue;

            // --- Price: .cat_price se .was (purani strikethrough) nikaal kar ---
            decimal price = 0;
            var priceBox = card.QuerySelector(".cat_price");
            if (priceBox != null)
            {
                // .was aur uske andar ka text hata dein, warna dono milkar galat number
                foreach (var was in priceBox.QuerySelectorAll(".was").ToList())
                    was.Remove();

                // ab jo bacha (jaise "374,999 - PKR") usmein se digits nikaal lein
                price = ParsePrice(priceBox.TextContent);
            }

            // --- Image: .image img (src ya data-original/data-src lazy) ---
            var img = card.QuerySelector(".image img") ?? card.QuerySelector("img");
            var image = img?.GetAttribute("src")
                      ?? img?.GetAttribute("data-original")
                      ?? img?.GetAttribute("data-src");
            if (!string.IsNullOrWhiteSpace(image) && image!.StartsWith("//"))
                image = "https:" + image;

            result.Add((name!, url, price, image));
        }

        return result;
    }

    private static decimal ParsePrice(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0;
        var digits = new string(text.Where(char.IsDigit).ToArray());
        return decimal.TryParse(digits, out var p) ? p : 0;
    }

    private static string Trim500(string s) => s.Length > 500 ? s[..500] : s;

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
                (ex is InvalidOperationException || ex is DbUpdateException
                 || ex.InnerException is System.Net.Sockets.SocketException
                 || ex.InnerException is IOException))
            {
                _logger.LogWarning("DB retry {Attempt}/{Max} — {Msg}", attempt, maxRetries, ex.Message);
                await Task.Delay(attempt * 2000); // 2s, 4s, 6s
            }
        }
        return default;
    }
}