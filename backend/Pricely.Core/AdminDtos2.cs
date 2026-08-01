using Pricely.Core.Entities;

namespace Pricely.Core.Dtos;

// ---------------- Duplicates ----------------

public record ListingDto(
    long Id,
    string Title,
    string StoreName,
    decimal Price,
    string Currency,
    bool PreSelected);

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

public record InviteRequest(string Email, UserRole Role);

public record InviteResponse(long InviteId, string Email, string Role, DateTimeOffset CreatedAt);

public record ChangeRoleRequest(UserRole Role);

// ---------------- Reports and activity ----------------

public record MoneyValue(decimal Amount, string Currency);

public record ReportsResponse(
    string Period,
    KpiValue ActiveShoppers,
    MoneyValue SavedByShoppers,
    IReadOnlyList<RankedItem> TrendingSearches);

public record ActivityEntryDto(
    long Id,
    string Description,
    string ActorName,
    DateTimeOffset OccurredAt);

public record ActivityResponse(
    IReadOnlyList<ActivityEntryDto> Items,
    int Page,
    int TotalPages);