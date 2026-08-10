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

    // NormalizeCategoryList returns ALL DB slugs that should match this query
    // (e.g. "audio" → ["audio","headphones","home_theater"])
    var norms = NormalizeCategoryList(category);

    var query = db.StoreListings.AsQueryable();

    // Store filter (optional) — store diya to sirf usi ka
    if (!string.IsNullOrWhiteSpace(store))
    {
        var storeClean = store.Trim().ToLower();
        query = query.Where(l => l.Store.Name.ToLower() == storeClean
                               || l.Store.Slug.ToLower() == storeClean);
    }

    // Category match — check if DB category is one of the normalized synonyms
    query = query.Where(l => l.Category != null && norms.Contains(l.Category.ToLower()));

    var catClean = category.Trim().ToLower();

    // Freshest pehle — pool utha kar memory mein round-robin/rotate
    var pool = await query
        .OrderByDescending(l => l.ScrapedAt)
        .Take(300)
        .Select(l => new Offer(
            l.RawTitle, l.Store.Name, l.Price.ToString(), "PKR",
            l.ProductUrl != null ? l.ProductUrl.Substring(l.ProductUrl.LastIndexOf('/') + 1) : "",
            l.ProductUrl ?? "", l.ImageUrl))
        .ToListAsync();

    // Fallback: If DB category matching yields 0 results for a specific subcategory, do title keyword search
    if (pool.Count == 0 && catClean != "all" && catClean != "electronics")
    {
        var kwQuery = db.StoreListings.AsQueryable();
        if (!string.IsNullOrWhiteSpace(store))
        {
            var storeClean = store.Trim().ToLower();
            kwQuery = kwQuery.Where(l => l.Store.Name.ToLower() == storeClean
                                      || l.Store.Slug.ToLower() == storeClean);
        }
        var searchKw = catClean.Replace('_', ' ');
        pool = await kwQuery
            .Where(l => l.RawTitle.ToLower().Contains(searchKw))
            .OrderByDescending(l => l.ScrapedAt)
            .Take(150)
            .Select(l => new Offer(
                l.RawTitle, l.Store.Name, l.Price.ToString(), "PKR",
                l.ProductUrl != null ? l.ProductUrl.Substring(l.ProductUrl.LastIndexOf('/') + 1) : "",
                l.ProductUrl ?? "", l.ImageUrl))
            .ToListAsync();
    }

    if (pool.Count == 0)
        return Results.Ok(new { Source = "database", Results = new List<Offer>() });

    int s = seed ?? 0;

    // Har store ke items alag karo -> seed se rotate (refresh variety) -> round-robin interleave
    var groups = pool
        .GroupBy(p => p.Store)
        .Select(g =>
        {
            var arr = g.ToList();
            int off = arr.Count > 0 ? ((s % arr.Count) + arr.Count) % arr.Count : 0;
            return arr.Skip(off).Concat(arr.Take(off)).ToList();
        })
        .ToList();

    var results = new List<Offer>();
    int max = groups.Count > 0 ? groups.Max(g => g.Count) : 0;
    for (int i = 0; i < max && results.Count < 80; i++)
        foreach (var g in groups)
            if (i < g.Count && results.Count < 80)
                results.Add(g[i]);

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
                    && l.Category != null)
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

    // Build base query with optional store filter
    var baseQuery = db.StoreListings.AsQueryable();
    if (!string.IsNullOrWhiteSpace(store))
    {
        var storeClean = store.Trim().ToLower();
        baseQuery = baseQuery.Where(l => l.Store.Name.ToLower() == storeClean
                                       || l.Store.Slug.ToLower() == storeClean);
    }

    // Combined: category match OR title contains — single query, both stores
    var fromDb = await baseQuery
        .Where(l => l.Category == queryClean
                 || l.RawTitle.ToLower().Contains(queryClean))
        .OrderBy(l => l.Price)
        .Take(80)
        .Select(l => new Offer(
            l.RawTitle, l.Store.Name, l.Price.ToString(), "PKR",
            l.ProductUrl != null ? l.ProductUrl.Substring(l.ProductUrl.LastIndexOf('/') + 1) : "",
            l.ProductUrl ?? "", l.ImageUrl))
        .ToListAsync();

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
app.MapMethods("/api/sync/telemart", new[] { "GET", "POST" }, (IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<TelemartSyncService>(s => s.SyncAllProductsAsync());
    return Results.Ok(new { Message = "Telemart sync background task shuru ho gayi hai." });
});

app.MapMethods("/api/sync-telemart", new[] { "GET", "POST" }, (IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<TelemartSyncService>(s => s.SyncAllProductsAsync());
    return Results.Ok(new { Message = "Telemart sync background task shuru ho gayi hai." });
});

app.MapMethods("/api/sync-telmart", new[] { "GET", "POST" }, (IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<TelemartSyncService>(s => s.SyncAllProductsAsync());
    return Results.Ok(new { Message = "Telemart sync background task shuru ho gayi hai." });
});

app.MapMethods("/api/sync/megapk", new[] { "GET", "POST" }, (IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<MegaPkSyncService>(s => s.SyncAllProductsAsync());
    return Results.Ok(new { Message = "Mega.pk sync background task shuru ho gayi hai." });
});

app.MapMethods("/api/sync-megapk", new[] { "GET", "POST" }, (IBackgroundJobClient jobs) =>
{
    jobs.Enqueue<MegaPkSyncService>(s => s.SyncAllProductsAsync());
    return Results.Ok(new { Message = "Mega.pk sync background task shuru ho gayi hai." });
});

//  TELEMART PRODUCT DETAIL — live
// ============================================================
app.MapGet("/api/product/{handle}", async (string handle, IHttpClientFactory httpFactory) =>
{
    var http = httpFactory.CreateClient();
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

    try
    {
        var json = await http.GetStringAsync($"https://www.telemart.pk/products/{handle}.json");
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
            Url         = $"https://www.telemart.pk/products/{handle}"
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Telemart detail mein masla: {ex.Message}");
    }
});


// ============================================================
//  MEGA.PK PRODUCT DETAIL — live (HTML se)
// ============================================================
app.MapGet("/api/megapk-product", async (string url, IHttpClientFactory httpFactory) =>
{
    if (string.IsNullOrWhiteSpace(url) || !url.Contains("mega.pk"))
        return Results.BadRequest("Sahi Mega.pk product URL do (?url=...)");

    var http = httpFactory.CreateClient();
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

    try
    {
        var html = await http.GetStringAsync(url);

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
            Title    = title,
            Store    = "Mega.pk",
            Price    = price.ToString(),
            Brand    = brand,
            Images   = new List<string> { mainImage },
            Specs    = specs,
            Url      = url
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Mega.pk detail mein masla: {ex.Message}");
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
// Returns ALL DB category slugs that should match the given query.
// E.g. "audio" → ["audio","headphones","home_theater"] — catches both Mega + Telemart.
// Browse endpoint calls this, then WHERE checks if DB category matches ANY slug in the list.
static string[] NormalizeCategoryList(string c)
{
    c = (c ?? "").Trim().ToLower().Replace('-', '_').Replace(' ', '_');
    return c switch
    {
        // Mobiles — top category: show all mobiles (iphones + androids + generic mobiles)
        "mobiles" =>
            new[] { "mobiles", "iphones", "androids" },
        "iphone" or "iphones" =>
            new[] { "iphones" },
        "android" or "androids" or "mobile" =>
            new[] { "mobiles", "androids" },
        "laptop" or "laptops" =>
            new[] { "laptops" },
        "tablet" or "tablets" =>
            new[] { "tablets" },
        "camera" or "cameras" =>
            new[] { "cameras", "digital_cameras", "mirrorless_cameras", "camera_lenses" },
        "monitor" or "monitors" =>
            new[] { "monitors" },
        "printer" or "printers" =>
            new[] { "printers", "inkjet_printers", "multifunction_printers" },
        "tv" or "tvs" or "television" or "televisions" or "led_tv" =>
            new[] { "televisions" },
        "audio" or "headphone" or "headphones" or "home_theater" =>
            new[] { "audio", "headphones", "home_theater" },
        "smartwatch" or "smart" or "analog" or "watch" or "watches" =>
            new[] { "watches" },
        "gaming" or "videogames" or "console" or "gaming_consoles" =>
            new[] { "gaming", "gaming_consoles" },
        "power_banks" or "powerbank" or "powerbanks" or "power_bank" =>
            new[] { "power banks", "power_banks" },
        "desktop" or "desktops" or "desktop_computers" or "server" or "servers" =>
            new[] { "desktop_computers", "servers" },
        "projector" or "projectors" =>
            new[] { "projectors" },
        "accessories" or "accessory" =>
            new[] { "accessories" },

        // --- APPLIANCES ---
        "appliances" =>
            new[] { "appliances", "air_conditioners", "fridge", "washing_machine", "microwave", "freezer", "fans", "kitchen_appliances", "irons", "heaters", "geyser" },
        "air_conditioners" or "acs" or "airconditioner" =>
            new[] { "air_conditioners", "appliances" },
        "fridge" or "refrigerator" or "freezer" =>
            new[] { "fridge", "freezer", "appliances" },
        "washing_machine" or "washing" or "washingmachine" =>
            new[] { "washing_machine", "appliances" },
        "microwave" or "microwaveovens" =>
            new[] { "microwave", "appliances" },
        "fans" or "fan" =>
            new[] { "fans", "appliances" },

        // --- BEAUTY ---
        "beauty" =>
            new[] { "beauty", "skincare", "makeup", "fragrances" },
        "skincare" =>
            new[] { "skincare", "beauty" },
        "makeup" =>
            new[] { "makeup", "beauty" },
        "fragrances" or "perfume" or "perfumes" =>
            new[] { "fragrances", "beauty" },

        // --- FASHION ---
        "fashion" =>
            new[] { "fashion", "menswear", "womenswear", "footwear" },
        "menswear" =>
            new[] { "menswear", "fashion" },
        "womenswear" =>
            new[] { "womenswear", "fashion" },
        "footwear" =>
            new[] { "footwear", "fashion" },

        // --- HOME & LIVING ---
        "home" =>
            new[] { "home", "furniture", "kitchenware", "bedding", "lighting" },
        "furniture" =>
            new[] { "furniture", "home" },
        "kitchenware" =>
            new[] { "kitchenware", "home" },
        "bedding" =>
            new[] { "bedding", "home" },
        "lighting" =>
            new[] { "lighting", "home" },

        _ => new[] { c }
    };
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