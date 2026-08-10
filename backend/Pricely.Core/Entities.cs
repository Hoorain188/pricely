namespace Pricely.Core.Entities;

// Every table in the existing Neon schema, mapped 1:1.
// Column names are snake_case in Postgres; the DbContext handles the
// conversion so C# stays PascalCase.

public class User
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public UserRole Role { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Set when the emailed signup code is confirmed; null means unverified.
    /// Kept separate from IsActive so login can tell "hasn't confirmed their
    /// email" apart from "waiting on an admin to approve them" — with only
    /// IsActive the two states are indistinguishable.
    /// Added by db/002_auth_columns.sql.
    /// </summary>
    public DateTimeOffset? EmailVerifiedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public UserNotificationSettings? NotificationSettings { get; set; }

    // First letter for the circular avatar on the Team screen
    public string AvatarInitial =>
        string.IsNullOrWhiteSpace(Name) ? "?" : Name[..1].ToUpperInvariant();
}

public class Store
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? BaseUrl { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<StoreListing> Listings { get; set; } = [];
    public ICollection<ScraperRun> Runs { get; set; } = [];
}

public class Category
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
}

public class Product
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public long? CategoryId { get; set; }
    public string? ImageUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Category? Category { get; set; }
    public ICollection<StoreListing> Listings { get; set; } = [];
}

/// <summary>One product as sold by one store. This is what the scraper writes.</summary>
public class StoreListing
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public long? ProductId { get; set; }

    /// <summary>Title exactly as scraped, before normalisation.</summary>
    public string RawTitle { get; set; } = "";

    public decimal Price { get; set; }
    public bool InStock { get; set; }
    public string? ProductUrl { get; set; }
    public string? ImageUrl { get; set; }
    public MatchStatus MatchStatus { get; set; }
    public DateTimeOffset ScrapedAt { get; set; }

    public Store Store { get; set; } = null!;
    public Product? Product { get; set; }
}

public class PriceHistoryPoint
{
    public long Id { get; set; }
    public long StoreListingId { get; set; }
    public decimal Price { get; set; }
    public DateTimeOffset RecordedAt { get; set; }

    public StoreListing StoreListing { get; set; } = null!;
}

/// <summary>A set of listings the matcher thinks are the same product. Drives the Duplicates screen.</summary>
public class MatchGroup
{
    public long Id { get; set; }

    /// <summary>0..1 from the matcher. The UI shows this as "92% MATCH".</summary>
    public decimal Confidence { get; set; }

    public MatchStatus Status { get; set; }
    public long? ResolvedBy { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User? ResolvedByUser { get; set; }
    public ICollection<MatchGroupListing> Listings { get; set; } = [];
}

/// <summary>Join table: which listings belong to which candidate group.</summary>
public class MatchGroupListing
{
    public long MatchGroupId { get; set; }
    public long StoreListingId { get; set; }

    public MatchGroup MatchGroup { get; set; } = null!;
    public StoreListing StoreListing { get; set; } = null!;
}

/// <summary>One scrape attempt. Drives the Scraper health card.</summary>
public class ScraperRun
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public ScraperRunStatus Status { get; set; }
    public int ItemsScraped { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }

    public Store Store { get; set; } = null!;
}

public class SearchQuery
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string QueryText { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

public class StoreClick
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public long StoreListingId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public StoreListing StoreListing { get; set; } = null!;
}

public class Favorite
{
    public long UserId { get; set; }
    public long ProductId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Product Product { get; set; } = null!;
}

public class PriceAlert
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long ProductId { get; set; }
    public decimal TargetPrice { get; set; }
    public bool IsTriggered { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? TriggeredAt { get; set; }
}

/// <summary>Covers BOTH team invites and inbound access requests, distinguished by Type.</summary>
public class TeamRequest
{
    public long Id { get; set; }
    public string Email { get; set; } = "";
    public string? Name { get; set; }
    public UserRole RequestedRole { get; set; }
    public TeamRequestType Type { get; set; }
    public TeamRequestStatus Status { get; set; }

    /// <summary>Admin who sent the invite. Null for inbound requests.</summary>
    public long? InvitedBy { get; set; }

    /// <summary>Admin who approved or rejected.</summary>
    public long? ReviewedBy { get; set; }

    /// <summary>
    /// The inactive account this request unlocks, for self-signups. Null for
    /// invites, where no account exists yet. Previously the two were linked
    /// only by matching email strings; a real foreign key means approving a
    /// request cannot silently target nothing.
    /// Added by db/002_auth_columns.sql.
    /// </summary>
    public long? UserId { get; set; }

    public string? InviteToken { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
}

/// <summary>Drives the Activity log screen.</summary>
public class ActivityLogEntry
{
    public long Id { get; set; }
    public long ActorId { get; set; }

    /// <summary>Machine-readable verb, e.g. "team.role_changed".</summary>
    public string Action { get; set; } = "";

    public string? TargetType { get; set; }
    public long? TargetId { get; set; }

    /// <summary>jsonb. Holds whatever the action needs to render a sentence.</summary>
    public string? Details { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public User Actor { get; set; } = null!;
}

/// <summary>Refresh tokens, one row per signed-in device. Drives Active sessions.</summary>
public class Session
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string RefreshTokenHash { get; set; } = "";
    public string? DeviceName { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset LastActiveAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsActive => RevokedAt is null;
}

public class UserNotificationSettings
{
    public long UserId { get; set; }
    public bool NewReports { get; set; }
    public bool SyncFailures { get; set; }
    public bool WeeklySummaryEmail { get; set; }
}

public class VerificationCode
{
    public long Id { get; set; }
    public string Email { get; set; } = "";
    public string CodeHash { get; set; } = "";
    public VerificationPurpose Purpose { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}