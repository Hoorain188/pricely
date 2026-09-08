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

    /// <summary>
    /// Base32 TOTP secret, shared with the authenticator app. Set when setup
    /// starts; 2FA only takes effect once TotpEnabled flips, so abandoning
    /// setup halfway cannot lock anyone out.
    /// Added by db/011_two_factor.sql.
    /// </summary>
    public string? TotpSecret { get; set; }

    /// <summary>True only after a first code has been confirmed.</summary>
    public bool TotpEnabled { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public UserNotificationSettings? NotificationSettings { get; set; }

    /// <summary>Logged-in devices. Auth revokes these on password or role change.</summary>
    public ICollection<Session> Sessions { get; set; } = [];

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

    /// <summary>Scraper-assigned category slug (e.g. "mobiles_tablets"). Used by browse/search endpoints.</summary>
    public string? Category { get; set; }

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
    /// <summary>
    /// The table gained a surrogate key when favourites were extended to
    /// listings: the old composite (user_id, product_id) cannot express "one
    /// row per user per listing", and two listing favourites for the same
    /// person both have product_id null, which would collide.
    /// </summary>
    public long Id { get; set; }

    public long UserId { get; set; }

    /// <summary>Set when favouriting a matched product across every store.</summary>
    public long? ProductId { get; set; }

    /// <summary>
    /// Set when favouriting one store's listing, which is what shoppers can
    /// actually tap — almost nothing is matched into a product yet.
    /// </summary>
    public long? StoreListingId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Product? Product { get; set; }
    public StoreListing? StoreListing { get; set; }
}

public class PriceAlert
{
    public long Id { get; set; }
    public long UserId { get; set; }

    /// <summary>
    /// Watches every store selling a matched product. Null when the alert is
    /// on a single listing instead — exactly one of the two is set, which the
    /// database enforces. Added by db/008_alerts_on_listings.sql.
    /// </summary>
    public long? ProductId { get; set; }

    /// <summary>
    /// Watches one store's price for one listing. This is what shoppers
    /// actually set, since almost nothing is matched into a product yet.
    /// </summary>
    public long? StoreListingId { get; set; }

    public decimal TargetPrice { get; set; }

    /// <summary>
    /// Set once the price has been at or below the target and the shopper has
    /// been told. Kept so the same drop is not announced on every scrape.
    /// </summary>
    public bool IsTriggered { get; set; }

    /// <summary>
    /// False means the shopper switched it off. Kept and still listed, but
    /// never fired. The Alerts screen has always had this switch; until now
    /// it changed nothing outside the app's memory.
    /// Added by db/010_alert_paused.sql.
    /// </summary>
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? TriggeredAt { get; set; }

    public StoreListing? StoreListing { get; set; }
    public Product? Product { get; set; }
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

    /// <summary>
    /// Invites expire — a link sitting in an old inbox is otherwise a standing
    /// way into the back office. Added by db/003_team_and_hardening.sql.
    /// </summary>
    public DateTimeOffset? ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }

    /// <summary>The account this request unlocks. Null for invites with no account yet.</summary>
    public User? User { get; set; }
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

    public User User { get; set; } = null!;
}

public class UserNotificationSettings
{
    public long UserId { get; set; }

    // Back-office concerns; the admin settings screen owns these.
    public bool NewReports { get; set; }
    public bool SyncFailures { get; set; }
    public bool WeeklySummaryEmail { get; set; }

    /// <summary>
    /// Shopper concerns. Both default to true — someone who sets a price
    /// alert has asked to be told when it hits, so silence is the deliberate
    /// choice, not the default. A user with no row at all is treated the same
    /// way: enabled. Added by db/009_user_notification_prefs.sql.
    /// </summary>
    public bool PriceAlertsPush { get; set; } = true;

    /// <summary>Independent of push, because a phone can be off or have notifications refused.</summary>
    public bool PriceAlertsEmail { get; set; } = true;
}

/// <summary>
/// A signup that has been started but not yet confirmed by email.
///
/// Signup used to insert straight into users with email_verified_at null. If
/// the code never arrived — spam folder, mail provider trouble, a typo in the
/// address — the row stayed forever: login refused it as unverified, and
/// signing up again refused it as taken, with no way out from inside the app.
///
/// Nothing lands in users now until a code is confirmed, so an abandoned
/// signup leaves only a row here, which expires and is cleared.
/// Added by db/006_pending_signups.sql.
/// </summary>
/// <summary>
/// A device that has agreed to receive notifications, and the address to
/// reach it on. Nothing can be sent to someone with no row here.
/// Added by db/007_push_tokens.sql.
/// </summary>
public class PushToken
{
    public long Id { get; set; }
    public long UserId { get; set; }

    /// <summary>
    /// Issued by Expo, e.g. "ExponentPushToken[xxxxxxxx]". Identifies the
    /// device, not the person — signing in as someone else on the same phone
    /// moves this row rather than adding another, or the previous account
    /// would keep receiving that device's notifications.
    /// </summary>
    public string Token { get; set; } = "";

    public string? Platform { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Last time Expo accepted a send. Stale rows are findable by this.</summary>
    public DateTimeOffset? LastUsedAt { get; set; }

    public User User { get; set; } = null!;
}

public class PendingSignup
{
    public long Id { get; set; }
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";

    /// <summary>Already hashed. A plain password is never stored, even here.</summary>
    public string PasswordHash { get; set; } = "";

    public UserRole Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>
    /// Long enough to find the mail, check spam, and ask for a resend or two;
    /// short enough that an address is not held hostage by someone who typed
    /// it by mistake.
    /// </summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(24);
}

/// <summary>
/// A one-time recovery code, for signing in when the authenticator app is
/// gone. Stored hashed: the plain codes are shown once at setup and never
/// again, so a database dump is not a set of working keys.
/// Added by db/011_two_factor.sql.
/// </summary>
public class BackupCode
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string CodeHash { get; set; } = "";

    /// <summary>Single use. Kept rather than deleted so "codes remaining" is answerable.</summary>
    public DateTimeOffset? UsedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
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

    /// <summary>
    /// Wrong guesses so far. Without this a 6-digit code can be attacked one
    /// request at a time until it lands, so the code dies after MaxAttempts.
    /// Added by db/003_team_and_hardening.sql.
    /// </summary>
    public int Attempts { get; set; }

    public const int MaxAttempts = 5;

    public bool IsUsable(DateTimeOffset now) =>
        UsedAt is null && ExpiresAt > now && Attempts < MaxAttempts;
}