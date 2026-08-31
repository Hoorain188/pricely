using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

public class TelemartSyncService : IStoreConnector
{
    public string StoreName => "Telemart";
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

                // One query per page instead of one per product. Looking each
                // listing up individually meant ~3,300 round trips to a cloud
                // database, which is where the 35 minutes went — not the HTTP.
                var pageUrls = new List<string>();
                foreach (var p in products)
                    if (p.TryGetProperty("handle", out var hh))
                    {
                        var hv = hh.GetString();
                        if (!string.IsNullOrWhiteSpace(hv))
                            pageUrls.Add($"https://www.telemart.pk/products/{hv}");
                    }

                var existingByUrl = await RetryAsync(() =>
                    db.StoreListings
                      .Where(l => l.StoreId == telemart.Id && pageUrls.Contains(l.ProductUrl))
                      .ToDictionaryAsync(l => l.ProductUrl!));

                foreach (var p in products)
                {
                    try
                    {
                        var title  = p.GetProperty("title").GetString() ?? "";
                        var handle = p.TryGetProperty("handle", out var h) ? h.GetString() : "";
                        var productType = p.TryGetProperty("product_type", out var ptE) ? ptE.GetString() : "";
                        var productUrl = $"https://www.telemart.pk/products/{handle}";

                        var category = CategoryMapper.Map(title, productType);

                        string? image = null;
                        if (p.TryGetProperty("images", out var imgs) && imgs.GetArrayLength() > 0)
                            if (imgs[0].TryGetProperty("src", out var src))
                                image = src.GetString();

                        decimal price = 0;
                        if (p.TryGetProperty("variants", out var vars) && vars.GetArrayLength() > 0)
                            if (vars[0].TryGetProperty("price", out var pr))
                                decimal.TryParse(pr.GetString(), out price);

                        if (string.IsNullOrWhiteSpace(handle))
                        {
                            skipped++;
                            continue;
                        }

                        existingByUrl.TryGetValue(productUrl, out var existing);

                        if (existing is null)
                        {
                            if (category == "other" || price <= 0)
                            {
                                skipped++;
                                continue;
                            }

                            db.StoreListings.Add(new StoreListing
                            {
                                StoreId    = telemart.Id,
                                RawTitle   = title.Length > 500 ? title[..500] : title,
                                Price      = price,
                                InStock    = true,
                                ProductUrl = productUrl,
                                ImageUrl   = image,
                                Category   = category,
                                ScrapedAt  = DateTimeOffset.UtcNow
                            });
                        }
                        else
                        {
                            if (price > 0 && existing.Price != price)
                            {
                                db.PriceHistory.Add(new PriceHistoryPoint
                                {
                                    StoreListingId = existing.Id,
                                    Price          = existing.Price,
                                    RecordedAt     = DateTimeOffset.UtcNow
                                });
                                existing.Price = price;
                            }
                            existing.Category  = category;
                            existing.ScrapedAt = DateTimeOffset.UtcNow;
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
                    open.FinishedAt   = DateTimeOffset.UtcNow;
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
                    stillOpen.FinishedAt   = DateTimeOffset.UtcNow;
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
