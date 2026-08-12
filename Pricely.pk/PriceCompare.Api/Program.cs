using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Hangfire.PostgreSql;
using PriceCompare.Api.Data;
using PriceCompare.Api.Models;
using PriceCompare.Api.Services;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

var connString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("ScraperClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddScoped<TelemartSyncService>();
builder.Services.AddScoped<MegaPkSyncService>();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connString, npgsqlOptions =>
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null)));

builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connString)));
builder.Services.AddHangfireServer();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAll");
app.UseHangfireDashboard("/hangfire");

RecurringJob.AddOrUpdate<TelemartSyncService>(
    "telemart-sync", s => s.SyncAllProductsAsync(), "0 */6 * * *");
RecurringJob.AddOrUpdate<MegaPkSyncService>(
    "megapk-sync", s => s.SyncAllProductsAsync(), "0 3-23/6 * * *");


// ============================================================
//  BROWSE — category products. Feature: store filter + round-robin
//  (har store barabar) + seed (refresh par naya/rotated data)
// ============================================================
app.MapGet("/api/browse", async (string category, string? store, int? seed, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(category))
        return Results.BadRequest("category khaali nahi ho sakta");

    // NormalizeCategory — ab dono stores same slug dete hain
    var norm = NormalizeCategory(category);

    var query = db.StoreListings.AsQueryable();

    // Sirf valid prices (price > 0)
    query = query.Where(l => l.Price > 0);

    // Store filter (optional) — store diya to sirf usi ka
    bool isSingleStore = !string.IsNullOrWhiteSpace(store);
    if (isSingleStore)
    {
        var storeClean = store!.Trim().ToLower();
        query = query.Where(l => l.Store.Name.ToLower() == storeClean
                               || l.Store.Slug.ToLower() == storeClean);
    }

    // Category match — direct equality (same slug from both stores)
    query = query.Where(l => l.Category != null && l.Category.ToLower() == norm);

    var catClean = category.Trim().ToLower();

    // Pool fetch
    var poolRaw = await query
        .OrderByDescending(l => l.ScrapedAt)
        .Take(400)
        .Select(l => new { l.RawTitle, StoreName = l.Store.Name, l.Price, l.ProductUrl, l.ImageUrl })
        .ToListAsync();

    var pool = poolRaw
        .Select(x => ToOffer(x.RawTitle, x.StoreName, x.Price, x.ProductUrl, x.ImageUrl))
        .ToList();

    // Fallback: If DB category matching yields 0 results, do title keyword search
    if (pool.Count == 0 && catClean != "all")
    {
        var kwQuery = db.StoreListings.AsQueryable().Where(l => l.Price > 0);
        if (isSingleStore)
        {
            var storeClean = store!.Trim().ToLower();
            kwQuery = kwQuery.Where(l => l.Store.Name.ToLower() == storeClean
                                      || l.Store.Slug.ToLower() == storeClean);
        }
        var searchKw = catClean.Replace('_', ' ');
        var kwPoolRaw = await kwQuery
            .Where(l => l.RawTitle.ToLower().Contains(searchKw))
            .OrderByDescending(l => l.ScrapedAt)
            .Take(200)
            .Select(l => new { l.RawTitle, StoreName = l.Store.Name, l.Price, l.ProductUrl, l.ImageUrl })
            .ToListAsync();

        pool = kwPoolRaw
            .Select(x => ToOffer(x.RawTitle, x.StoreName, x.Price, x.ProductUrl, x.ImageUrl))
            .ToList();
    }

    if (pool.Count == 0)
        return Results.Ok(new { Source = "database", Results = new List<Offer>() });

    int s = seed ?? 0;

    int totalTargetLimit = isSingleStore ? 50 : 100;
    int perStoreLimit = 50;

    // Separate by store, rotate with seed, take up to 50 items per store
    var groups = pool
        .GroupBy(p => p.Store)
        .Select(g =>
        {
            var arr = g.ToList();
            int off = arr.Count > 0 ? ((s % arr.Count) + arr.Count) % arr.Count : 0;
            var rotated = arr.Skip(off).Concat(arr.Take(off)).ToList();
            return rotated.Take(perStoreLimit).ToList();
        })
        .ToList();

    // Equal Round-robin interleave across stores up to totalTargetLimit (100 total, 50 per store)
    var results = new List<Offer>();
    int maxInGroup = groups.Count > 0 ? groups.Max(g => g.Count) : 0;
    for (int i = 0; i < maxInGroup && results.Count < totalTargetLimit; i++)
    {
        foreach (var g in groups)
        {
            if (i < g.Count && results.Count < totalTargetLimit)
                results.Add(g[i]);
        }
    }

    return Results.Ok(new { Source = "database", Results = results });
});


// ============================================================
//  STORE-CATEGORIES — kisi store ki asal categories (jitni us mein data hai).
//  Frontend isse pooch kar sirf wohi categories dikhata hai jo store par hain.
//    GET /api/store-categories?store=Mega.pk
// ============================================================
app.MapGet("/api/store-categories", async (string store, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(store))
        return Results.BadRequest("store khaali nahi ho sakta");

    var storeClean = store.Trim().ToLower();

    var cats = await db.StoreListings
        .Where(l => (l.Store.Name.ToLower() == storeClean || l.Store.Slug.ToLower() == storeClean)
                    && l.Category != null
                    && l.Price > 0)
        .GroupBy(l => l.Category)
        .Select(g => new { category = g.Key, count = g.Count() })
        .OrderByDescending(x => x.count)
        .ToListAsync();

    return Results.Ok(cats);
});


// ============================================================
//  SEARCH — combined category + title search (dono stores)
// ============================================================
app.MapGet("/api/search", async (string q, string? store, IHttpClientFactory httpFactory, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(q))
        return Results.BadRequest("q khaali nahi ho sakta");

    var queryClean = q.Trim().ToLower();
    var keywords = queryClean.Split(' ', StringSplitOptions.RemoveEmptyEntries);

    // Build base query with optional store filter and price > 0 filter
    var baseQuery = db.StoreListings.AsQueryable().Where(l => l.Price > 0);
    if (!string.IsNullOrWhiteSpace(store))
    {
        var storeClean = store.Trim().ToLower();
        baseQuery = baseQuery.Where(l => l.Store.Name.ToLower() == storeClean
                                       || l.Store.Slug.ToLower() == storeClean);
    }

    // 1. All keywords match in Title OR exact category match
    var fromDbRaw = await baseQuery
        .Where(l => l.Category == queryClean
                 || (keywords.Length > 0 && keywords.All(kw => l.RawTitle.ToLower().Contains(kw))))
        .OrderBy(l => l.Price)
        .Take(100)
        .Select(l => new { l.RawTitle, StoreName = l.Store.Name, l.Price, l.ProductUrl, l.ImageUrl })
        .ToListAsync();

    // 2. Fallback: Any keyword match in Title (if all keywords together returned 0)
    if (fromDbRaw.Count == 0 && keywords.Length > 1)
    {
        fromDbRaw = await baseQuery
            .Where(l => keywords.Any(kw => l.RawTitle.ToLower().Contains(kw)))
            .OrderBy(l => l.Price)
            .Take(100)
            .Select(l => new { l.RawTitle, StoreName = l.Store.Name, l.Price, l.ProductUrl, l.ImageUrl })
            .ToListAsync();
    }

    var fromDb = fromDbRaw
        .Select(x => ToOffer(x.RawTitle, x.StoreName, x.Price, x.ProductUrl, x.ImageUrl))
        .ToList();

    if (fromDb.Count > 0)
        return Results.Ok(new { Source = "database", Results = fromDb });

    // Fallback: live Telemart search API (only if DB had zero results)
    var http = httpFactory.CreateClient();
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

    var url = $"https://www.telemart.pk/search/suggest.json" +
              $"?q={Uri.EscapeDataString(q)}&resources[type]=product&resources[limit]=10";

    var offers = new List<Offer>();
    try
    {
        var json = await http.GetStringAsync(url);
        using var doc = JsonDocument.Parse(json);
        var products = doc.RootElement.GetProperty("resources").GetProperty("results").GetProperty("products");

        foreach (var p in products.EnumerateArray())
        {
            var title  = p.GetProperty("title").GetString() ?? "";
            var handle = p.TryGetProperty("handle", out var h) ? h.GetString() : "";
            var priceStr = p.TryGetProperty("price", out var pr) ? pr.GetString() : "0";
            var image  = p.TryGetProperty("image", out var img) ? img.GetString() : null;
            decimal.TryParse(priceStr, out var price);
            offers.Add(new Offer(title, "Telemart", price.ToString(), "PKR",
                handle ?? "", $"https://www.telemart.pk/products/{handle}", image));
        }
    }
    catch (Exception ex)
    {
        return Results.Problem($"Telemart search mein masla: {ex.Message}");
    }

    return Results.Ok(new { Source = "telemart-live", Results = offers });
});


// ============================================================
//  MANUAL SYNC TRIGGER — Telemart & Mega.pk sync endpoints
// ============================================================
app.MapPost("/api/sync-telemart", (IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<TelemartSyncService>(s => s.SyncAllProductsAsync());
    return Results.Ok(new { Message = "Telemart sync background task shuru ho gayi hai." });
});

app.MapPost("/api/sync-megapk", (IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<MegaPkSyncService>(s => s.SyncAllProductsAsync());
    return Results.Ok(new { Message = "Mega.pk sync background task shuru ho gayi hai." });
});

// ============================================================
//  TELEMART PRODUCT DETAIL — live
// ============================================================
app.MapGet("/api/product/{handle}", async (string handle, IHttpClientFactory httpFactory) =>
{
    var http = httpFactory.CreateClient("ScraperClient");
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

    try
    {
        var safeHandle = Uri.EscapeDataString(handle);
        var json = await http.GetStringAsync($"https://www.telemart.pk/products/{safeHandle}.json");
        using var doc = JsonDocument.Parse(json);
        var product = doc.RootElement.GetProperty("product");

        var images = new List<string>();
        if (product.TryGetProperty("images", out var imgs))
            foreach (var img in imgs.EnumerateArray())
                if (img.TryGetProperty("src", out var src))
                    images.Add(src.GetString() ?? "");

        var variants = new List<object>();
        if (product.TryGetProperty("variants", out var vars))
            foreach (var vr in vars.EnumerateArray())
                variants.Add(new
                {
                    Title = vr.TryGetProperty("title", out var vt) ? vt.GetString() : "",
                    Price = vr.TryGetProperty("price", out var vp) ? vp.GetString() : "0",
                    Available = vr.TryGetProperty("available", out var va) && va.GetBoolean()
                });

        return Results.Ok(new
        {
            Title       = product.GetProperty("title").GetString(),
            Store       = "Telemart",
            Description = product.TryGetProperty("body_html", out var b) ? b.GetString() : "",
            Brand       = product.TryGetProperty("vendor", out var v) ? v.GetString() : "",
            Images      = images,
            Variants    = variants,
            Url         = $"https://www.telemart.pk/products/{safeHandle}"
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Telemart detail mein masla: {ex.Message}");
    }
});


// ============================================================
//  MEGA.PK PRODUCT DETAIL — live (HTML se + DB fallback)
// ============================================================
app.MapGet("/api/megapk-product", async (string url, IHttpClientFactory httpFactory, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(url))
        return Results.BadRequest("Sahi Mega.pk product URL do (?url=...)");

    var cleanUrl = url.Trim();
    if (!cleanUrl.StartsWith("http://") && !cleanUrl.StartsWith("https://"))
    {
        cleanUrl = "https://www.mega.pk/" + cleanUrl.TrimStart('/');
    }

    if (!Uri.TryCreate(cleanUrl, UriKind.Absolute, out var uri) ||
        (uri.Host != "mega.pk" && !uri.Host.EndsWith(".mega.pk", StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest("Sirf valid Mega.pk URLs allowed hain.");
    }

    var http = httpFactory.CreateClient("ScraperClient");
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    try
    {
        var response = await http.GetAsync(cleanUrl);
        if (!response.IsSuccessStatusCode)
        {
            var listing = await db.StoreListings.FirstOrDefaultAsync(l => l.ProductUrl == url || l.ProductUrl == cleanUrl);
            return Results.Ok(new
            {
                Title = listing?.RawTitle ?? "Mega.pk Product",
                Store = "Mega.pk",
                Price = (listing?.Price ?? 0).ToString(),
                Brand = "Mega.pk",
                Images = new List<string> { listing?.ImageUrl ?? "" },
                Specs = new List<object>(),
                Url = cleanUrl
            });
        }

        var html = await response.Content.ReadAsStringAsync();

        var titleM = Regex.Match(html, @"<h2 class=""product-title""\s*>(.*?)</h2>", RegexOptions.Singleline);
        var title = titleM.Success ? CleanText(titleM.Groups[1].Value) : "";

        var imgM = Regex.Match(html, @"<img[^>]*id=""main-prod-img""[^>]*>", RegexOptions.Singleline);
        var mainImage = "";
        if (imgM.Success)
        {
            var srcM = Regex.Match(imgM.Value, @"src=""([^""]+)""");
            if (srcM.Success) mainImage = srcM.Groups[1].Value;
        }

        decimal price = 0;
        var priceM = Regex.Match(html, @"og:description""\s+content=""[^""]*is Rs\.?\s*([\d,]+(?:\.\d+)?)", RegexOptions.IgnoreCase);
        if (!priceM.Success)
            priceM = Regex.Match(html, @"<strong>\s*([\d,]+)\s*-\s*PKR", RegexOptions.IgnoreCase);
        if (priceM.Success)
            decimal.TryParse(priceM.Groups[1].Value.Replace(",", ""), out price);

        var brandM = Regex.Match(html, @"product:brand""\s+content=""([^""]+)""", RegexOptions.IgnoreCase);
        var brand = brandM.Success ? brandM.Groups[1].Value : "";

        var specs = new List<object>();
        var tableM = Regex.Match(html, @"<table id=""laptop_detail""[^>]*>(.*?)</table>", RegexOptions.Singleline);
        if (tableM.Success)
        {
            var rows = Regex.Matches(tableM.Groups[1].Value, @"<tr>(.*?)</tr>", RegexOptions.Singleline);
            foreach (Match row in rows)
            {
                var cells = Regex.Matches(row.Groups[1].Value, @"<t[dh][^>]*>(.*?)</t[dh]>", RegexOptions.Singleline);
                if (cells.Count == 2)
                {
                    var label = CleanText(cells[0].Groups[1].Value);
                    var value = CleanText(cells[1].Groups[1].Value);
                    if (!string.IsNullOrWhiteSpace(label))
                        specs.Add(new { Label = label, Value = value });
                }
            }
        }

        return Results.Ok(new
        {
            Title = string.IsNullOrWhiteSpace(title) ? "Mega.pk Product" : title,
            Store = "Mega.pk",
            Price = price.ToString(),
            Brand = brand,
            Images = new List<string> { mainImage },
            Specs = specs,
            Url = cleanUrl
        });
    }
    catch (Exception)
    {
        var listing = await db.StoreListings.FirstOrDefaultAsync(l => l.ProductUrl == url || l.ProductUrl == cleanUrl);
        return Results.Ok(new
        {
            Title = listing?.RawTitle ?? "Mega.pk Product",
            Store = "Mega.pk",
            Price = (listing?.Price ?? 0).ToString(),
            Brand = "Mega.pk",
            Images = new List<string> { listing?.ImageUrl ?? "" },
            Specs = new List<object>(),
            Url = cleanUrl
        });
    }
});


// (Manual sync triggers defined above at lines 204-229)


// ============================================================
//  TEST — db connection
// ============================================================
app.MapGet("/api/db-test", async (AppDbContext db) =>
{
    try
    {
        return Results.Ok(new
        {
            Message  = "Database connection kaam kar raha hai!",
            Stores   = await db.Stores.CountAsync(),
            Listings = await db.StoreListings.CountAsync()
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database mein masla: {ex.Message}");
    }
});


app.Run();


// ===== Helper: HTML tags aur extra spaces saaf karta hai =====
static string CleanText(string raw)
{
    var noTags = Regex.Replace(raw, @"<[^>]+>", "");
    var decoded = System.Net.WebUtility.HtmlDecode(noTags);
    return Regex.Replace(decoded, @"\s+", " ").Trim();
}


// ===== Helper: category naam normalize =====
static string NormalizeCategory(string? c) => (c ?? "").Trim().ToLower();

// ===== Helper: DB raw fields se Offer object banata hai (Handle in-memory calculate hota hai) =====
static Offer ToOffer(string title, string store, decimal price, string? url, string? imageUrl)
{
    string handle = "";
    if (!string.IsNullOrEmpty(url))
    {
        int idx = url.LastIndexOf('/');
        handle = idx >= 0 ? url[(idx + 1)..] : url;
    }
    return new Offer(title, store, price.ToString(), "PKR", handle, url ?? "", imageUrl);
}


// ===== Data ki shakal (search ke liye) =====
record Offer(
    string Title,
    string Store,
    string Price,
    string Currency,
    string Handle,
    string Url,
    string? ImageUrl
);