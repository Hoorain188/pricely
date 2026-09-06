using Microsoft.EntityFrameworkCore;
using Pricely.Core.Entities;
using System.Text.RegularExpressions;

namespace Pricely.Infrastructure;

/// <summary>
/// Maps the EXISTING Neon schema. This context does not own the schema —
/// it must never generate migrations that create or drop these tables.
/// If the schema changes, whoever owns it changes it, and this file follows.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StoreListing> StoreListings => Set<StoreListing>();
    public DbSet<PriceHistoryPoint> PriceHistory => Set<PriceHistoryPoint>();
    public DbSet<MatchGroup> MatchGroups => Set<MatchGroup>();
    public DbSet<MatchGroupListing> MatchGroupListings => Set<MatchGroupListing>();
    public DbSet<ScraperRun> ScraperRuns => Set<ScraperRun>();
    public DbSet<SearchQuery> SearchQueries => Set<SearchQuery>();
    public DbSet<StoreClick> StoreClicks => Set<StoreClick>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<PriceAlert> PriceAlerts => Set<PriceAlert>();
    public DbSet<TeamRequest> TeamRequests => Set<TeamRequest>();
    public DbSet<ActivityLogEntry> ActivityLog => Set<ActivityLogEntry>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<UserNotificationSettings> UserNotificationSettings => Set<UserNotificationSettings>();
    public DbSet<VerificationCode> VerificationCodes => Set<VerificationCode>();
    public DbSet<PendingSignup> PendingSignups => Set<PendingSignup>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Enum types are registered in Program.cs via UseNpgsql(o => o.MapEnum<T>()).
        // Declaring them here as well causes duplicate model configuration.

        // Composite / non-standard keys
        b.Entity<Favorite>().HasKey(f => new { f.UserId, f.ProductId });
        b.Entity<MatchGroupListing>().HasKey(m => new { m.MatchGroupId, m.StoreListingId });
        b.Entity<UserNotificationSettings>().HasKey(s => s.UserId);

        b.Entity<User>()
            .HasOne(u => u.NotificationSettings)
            .WithOne()
            .HasForeignKey<UserNotificationSettings>(s => s.UserId);

        b.Entity<ActivityLogEntry>()
            .HasOne(a => a.Actor).WithMany().HasForeignKey(a => a.ActorId);

        b.Entity<MatchGroup>()
            .HasOne(m => m.ResolvedByUser).WithMany().HasForeignKey(m => m.ResolvedBy);

        // activity_log.details is jsonb; we keep it as a raw JSON string.
        b.Entity<ActivityLogEntry>().Property(a => a.Details).HasColumnType("jsonb");

        // Postgres uses snake_case; C# uses PascalCase. Translate everything
        // in one pass instead of writing HasColumnName 100 times.
        foreach (var entity in b.Model.GetEntityTypes())
        {
            entity.SetTableName(ToSnake(entity.GetTableName()!));

            foreach (var prop in entity.GetProperties())
                prop.SetColumnName(ToSnake(prop.Name));

            foreach (var key in entity.GetKeys())
                key.SetName(ToSnake(key.GetName()!));

            foreach (var fk in entity.GetForeignKeys())
                fk.SetConstraintName(ToSnake(fk.GetConstraintName()!));

            foreach (var idx in entity.GetIndexes())
                idx.SetDatabaseName(ToSnake(idx.GetDatabaseName()!));
        }
    }

    private static string ToSnake(string name) =>
        Regex.Replace(name, "([a-z0-9])([A-Z])", "$1_$2").ToLowerInvariant();
}