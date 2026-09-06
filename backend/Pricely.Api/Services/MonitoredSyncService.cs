using Microsoft.EntityFrameworkCore;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

// Har sync ko lapet kar scraper_runs mein record karta hai
public class MonitoredSyncService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<MonitoredSyncService> _logger;

    public MonitoredSyncService(IServiceProvider services, ILogger<MonitoredSyncService> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task RunWithMonitoringAsync(string storeSlug)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var store = await db.Stores.FirstOrDefaultAsync(s => s.Slug == storeSlug);
        if (store == null)
        {
            _logger.LogWarning("Store '{Slug}' nahi mila", storeSlug);
            return;
        }

        // Sync se pehle count
        var beforeCount = await db.StoreListings.CountAsync(l => l.StoreId == store.Id);
        var startedAt = DateTime.UtcNow;
        long runId = 0;

        // 1) Run shuru — record banao
        try
        {
            var ids = await db.Database.SqlQueryRaw<long>(@"
                INSERT INTO scraper_runs (store_id, status, items_scraped, started_at)
                VALUES ({0}, {1}::scraper_run_status, 0, {2})
                RETURNING id;",
                store.Id, "ok", startedAt).ToListAsync();
            runId = ids.First();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "scraper_runs record nahi bana — sync phir bhi chalega");
        }

        // 2) Asal sync chalao
        try
        {
            var connector = scope.ServiceProvider
                .GetServices<IStoreConnector>()
                .FirstOrDefault(c => c.StoreName.ToLower().Contains(storeSlug.ToLower())
                                  || storeSlug.ToLower().Contains(c.StoreName.ToLower().Replace(".pk", "")));

            if (connector == null)
            {
                _logger.LogWarning("Connector '{Slug}' ke liye nahi mila", storeSlug);
                return;
            }

            await connector.SyncAllProductsAsync();

            // 3) Kaamyab — record update karo
            var afterCount = await db.StoreListings.CountAsync(l => l.StoreId == store.Id);
            var scraped = Math.Max(0, afterCount - beforeCount);

            if (runId > 0)
            {
                await db.Database.ExecuteSqlRawAsync(@"
                    UPDATE scraper_runs
                    SET status = {0}::scraper_run_status, items_scraped = {1}, finished_at = {2}
                    WHERE id = {3};",
                    "ok", afterCount, DateTime.UtcNow, runId);
            }

            _logger.LogInformation("{Store} sync mukammal. Total: {Total} (naye: {New})",
                store.Name, afterCount, scraped);

            // Prices have just moved, so this is the moment to see whether any
            // shopper was waiting for one of them. Its own try/catch: a
            // notification that cannot be sent must not turn a successful
            // scrape into a failed one.
            try
            {
                var checker = scope.ServiceProvider.GetRequiredService<IPriceAlertChecker>();
                await checker.CheckStoreAsync(store.Id);
            }
            catch (Exception alertEx)
            {
                _logger.LogError(alertEx, "{Store} ke price alerts check nahi ho sake", store.Name);
            }
        }
        catch (Exception ex)
        {
            // 4) Fail — error record karo
            _logger.LogError(ex, "{Store} sync fail", store.Name);

            if (runId > 0)
            {
                var msg = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
                await db.Database.ExecuteSqlRawAsync(@"
                    UPDATE scraper_runs
                    SET status = {0}::scraper_run_status, error_message = {1}, finished_at = {2}
                    WHERE id = {3};",
                    "fail", msg, DateTime.UtcNow, runId);
            }

            // Tell the back office, but only those who asked to hear about it —
            // that is what the sync_failures toggle on the settings screen was
            // always meant to control, and until now nothing read it.
            try
            {
                var watchers = await db.UserNotificationSettings
                    .Where(s => s.SyncFailures)
                    .Join(db.Users.Where(u => u.IsActive && u.Role != UserRole.User),
                          s => s.UserId, u => u.Id, (s, u) => u.Id)
                    .ToListAsync();

                var push = scope.ServiceProvider.GetRequiredService<IPushSender>();
                await push.SendToUsersAsync(
                    watchers,
                    "Scraper failed",
                    $"The {store.Name} sync did not finish. Check the dashboard.",
                    new { type = "sync_failure", storeId = store.Id });
            }
            catch (Exception notifyEx)
            {
                _logger.LogError(notifyEx, "Sync failure ki ittila nahi bhej sake");
            }
        }
    }
}
