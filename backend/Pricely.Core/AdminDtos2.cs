using Pricely.Core.Entities;

namespace Pricely.Core.Dtos;

// ---------------- Duplicates ----------------

public record ListingDto(
    long Id,
    string Title,
    string StoreName,
    decimal Price,
    string Currency,
    bool PreSelected,
    string? ImageUrl);

public record DuplicateGroupDto(
    long Id,
    string Title,
    int MatchScore,
    /// <summary>Set once merged. The Split action needs it; null while pending.</summary>
    long? ProductId,
    IReadOnlyList<ListingDto> Listings);

public record DuplicatesResponse(
    int PendingCount,
    int MergedCount,
    IReadOnlyList<DuplicateGroupDto> Items,
    int Page,
    int TotalPages);

public record MergeRequest(IReadOnlyList<long> ListingIds);

public record DuplicateActionResponse(long? ProductId, int PendingCount, int MergedCount);

// ---------------- Team and customers ----------------

public record TeamMemberDto(
    long Id,
    string Name,
    string Email,
    string Role,
    string? JobTitle,
    string AvatarInitial);

public record TeamResponse(int TotalCount, IReadOnlyList<TeamMemberDto> Items);

public record CustomerDto(long Id, string Name, string Email, int AlertCount, bool IsActive);

public record CustomersResponse(
    int TotalCount,
    IReadOnlyList<CustomerDto> Items,
    int Page,
    int TotalPages);

/// <summary>
/// Role arrives as a string, not the enum. Model binding an enum makes any
/// casing mismatch ("readonly" vs "ReadOnly") a generic 400 validation error
/// with no useful message; parsing it ourselves lets any casing through.
/// </summary>
public record InviteRequest(string Email, string Role);

/// <summary>
/// InviteCode is set only when the invite could not be emailed — which, with
/// no mail provider, is every time. The admin passes it on by hand, and the
/// invitee enters it under "Have an invite code?". It was previously produced
/// by TeamService and then dropped here, so the admin never saw it.
/// </summary>
public record InviteResponse(
    long InviteId, string Email, string Role, DateTimeOffset CreatedAt, string? InviteCode = null);

public record ChangeRoleRequest(string Role);

/// <summary>An inbound "let me in" request — team_requests with type = self_signup.</summary>
public record TeamRequestDto(
    long Id,
    string Email,
    string? Name,
    string RequestedRole,
    DateTimeOffset RequestedAt,
    // An invite and a self-signup request need different actions: one is
    // revoked, the other approved. Without Type the screen showed both as
    // requests, and approving an invite 404s because it has no user yet.
    string Type,
    DateTimeOffset? ExpiresAt);

public record NotificationPrefsDto(
    bool NewReports,
    bool SyncFailures,
    bool WeeklySummaryEmail);

// ---------------- Reports and activity ----------------

public record MoneyValue(decimal Amount, string Currency);

public record PriceChangeDto(
    string Product,
    decimal FromPrice,
    decimal ToPrice,
    double ChangePercent);

/// <summary>A bar row whose value is money rather than a count.</summary>
public record MoneyRankedItem(string Label, decimal Amount);

public record ReportsResponse(
    string Period,
    KpiValue ActiveShoppers,
    MoneyValue SavedByShoppers,
    IReadOnlyList<RankedItem> TrendingSearches,
    IReadOnlyList<PriceChangeDto> PriceChanges,
    IReadOnlyList<MoneyRankedItem> StoreAverages,
    IReadOnlyList<RankedItem> Categories);

public record ActivityEntryDto(
    long Id,
    string Description,
    string ActorName,
    DateTimeOffset OccurredAt);

public record ActivityResponse(
    IReadOnlyList<ActivityEntryDto> Items,
    int Page,
    int TotalPages);
/// <summary>One merged product and how many stores carry it.</summary>
public record AdminProductDto(
    long Id,
    string Name,
    string? Category,
    int ListingCount,
    int StoreCount,
    decimal? LowestPrice,
    decimal? HighestPrice,
    string? ImageUrl);

public record AdminProductsResponse(
    IReadOnlyList<AdminProductDto> Items,
    int Total,
    int Page,
    int TotalPages);
