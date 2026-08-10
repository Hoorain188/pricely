namespace Pricely.Core.Dtos;

public record KpiValue(int Value, double? ChangePercent);

public record ScraperStatusDto(
    long StoreId,
    string StoreName,
    string Status,          // "ok" | "fail" | "running"
    DateTimeOffset? LastRunAt,
    int ItemCount,
    bool CanRun);

public record ScraperErrorDto(string StoreName, string Message, DateTimeOffset OccurredAt);

public record RankedItem(string Label, int Count);

public record DashboardKpis(
    KpiValue TotalUsers,
    KpiValue ProductsTracked,
    KpiValue ActiveAlerts,
    int ScrapersHealthy,
    int ScrapersTotal);

public record DashboardResponse(
    DateTimeOffset LastUpdatedAt,
    DashboardKpis Kpis,
    IReadOnlyList<ScraperStatusDto> Scrapers,
    IReadOnlyList<RankedItem> TopSearches,
    IReadOnlyList<RankedItem> MostTracked,
    IReadOnlyList<RankedItem> StoreClicks,
    IReadOnlyList<ScraperErrorDto> RecentErrors);