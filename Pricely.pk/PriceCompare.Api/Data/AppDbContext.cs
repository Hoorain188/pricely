using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using PriceCompare.Api.Models;

namespace PriceCompare.Api.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActivityLog> ActivityLogs { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Favorite> Favorites { get; set; }

    public virtual DbSet<MatchGroup> MatchGroups { get; set; }

    public virtual DbSet<PriceAlert> PriceAlerts { get; set; }

    public virtual DbSet<PriceHistory> PriceHistories { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ScraperRun> ScraperRuns { get; set; }

    public virtual DbSet<SearchQuery> SearchQueries { get; set; }

    public virtual DbSet<Session> Sessions { get; set; }

    public virtual DbSet<Store> Stores { get; set; }

    public virtual DbSet<StoreClick> StoreClicks { get; set; }

    public virtual DbSet<StoreListing> StoreListings { get; set; }

    public virtual DbSet<TeamRequest> TeamRequests { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserNotificationSetting> UserNotificationSettings { get; set; }

    public virtual DbSet<VerificationCode> VerificationCodes { get; set; }

    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("listing_match_status", new[] { "unmatched", "needs_review", "matched", "rejected" })
            .HasPostgresEnum("scraper_run_status", new[] { "ok", "fail" })
            .HasPostgresEnum("team_request_status", new[] { "pending", "approved", "rejected" })
            .HasPostgresEnum("team_request_type", new[] { "invite", "self_signup" })
            .HasPostgresEnum("user_role", new[] { "admin", "support", "readonly", "user" })
            .HasPostgresEnum("verification_purpose", new[] { "signup", "password_reset" });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("activity_log_pkey");

            entity.ToTable("activity_log");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action)
                .HasMaxLength(80)
                .HasColumnName("action");
            entity.Property(e => e.ActorId).HasColumnName("actor_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Details)
                .HasColumnType("jsonb")
                .HasColumnName("details");
            entity.Property(e => e.TargetId).HasColumnName("target_id");
            entity.Property(e => e.TargetType)
                .HasMaxLength(80)
                .HasColumnName("target_type");

            entity.HasOne(d => d.Actor).WithMany(p => p.ActivityLogs)
                .HasForeignKey(d => d.ActorId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("activity_log_actor_id_fkey");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("categories_pkey");

            entity.ToTable("categories");

            entity.HasIndex(e => e.Name, "categories_name_key").IsUnique();

            entity.HasIndex(e => e.Slug, "categories_slug_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name)
                .HasMaxLength(80)
                .HasColumnName("name");
            entity.Property(e => e.Slug)
                .HasMaxLength(80)
                .HasColumnName("slug");
        });

        modelBuilder.Entity<Favorite>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.ProductId }).HasName("favorites_pkey");

            entity.ToTable("favorites");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");

            entity.HasOne(d => d.Product).WithMany(p => p.Favorites)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("favorites_product_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Favorites)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("favorites_user_id_fkey");
        });

        modelBuilder.Entity<MatchGroup>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("match_groups_pkey");

            entity.ToTable("match_groups");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Confidence)
                .HasPrecision(5, 2)
                .HasColumnName("confidence");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ResolvedAt).HasColumnName("resolved_at");
            entity.Property(e => e.ResolvedBy).HasColumnName("resolved_by");

            entity.HasOne(d => d.ResolvedByNavigation).WithMany(p => p.MatchGroups)
                .HasForeignKey(d => d.ResolvedBy)
                .HasConstraintName("match_groups_resolved_by_fkey");

            entity.HasMany(d => d.StoreListings).WithMany(p => p.MatchGroups)
                .UsingEntity<Dictionary<string, object>>(
                    "MatchGroupListing",
                    r => r.HasOne<StoreListing>().WithMany()
                        .HasForeignKey("StoreListingId")
                        .HasConstraintName("match_group_listings_store_listing_id_fkey"),
                    l => l.HasOne<MatchGroup>().WithMany()
                        .HasForeignKey("MatchGroupId")
                        .HasConstraintName("match_group_listings_match_group_id_fkey"),
                    j =>
                    {
                        j.HasKey("MatchGroupId", "StoreListingId").HasName("match_group_listings_pkey");
                        j.ToTable("match_group_listings");
                        j.IndexerProperty<long>("MatchGroupId").HasColumnName("match_group_id");
                        j.IndexerProperty<long>("StoreListingId").HasColumnName("store_listing_id");
                    });
        });

        modelBuilder.Entity<PriceAlert>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("price_alerts_pkey");

            entity.ToTable("price_alerts");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.IsTriggered).HasColumnName("is_triggered");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.TargetPrice)
                .HasPrecision(12, 2)
                .HasColumnName("target_price");
            entity.Property(e => e.TriggeredAt).HasColumnName("triggered_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Product).WithMany(p => p.PriceAlerts)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("price_alerts_product_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.PriceAlerts)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("price_alerts_user_id_fkey");
        });

        modelBuilder.Entity<PriceHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("price_history_pkey");

            entity.ToTable("price_history");

            entity.HasIndex(e => new { e.StoreListingId, e.RecordedAt }, "idx_price_history_listing");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.RecordedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("recorded_at");
            entity.Property(e => e.StoreListingId).HasColumnName("store_listing_id");

            entity.HasOne(d => d.StoreListing).WithMany(p => p.PriceHistories)
                .HasForeignKey(d => d.StoreListingId)
                .HasConstraintName("price_history_store_listing_id_fkey");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("products_pkey");

            entity.ToTable("products");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("products_category_id_fkey");
        });

        modelBuilder.Entity<ScraperRun>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("scraper_runs_pkey");

            entity.ToTable("scraper_runs");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
            entity.Property(e => e.FinishedAt).HasColumnName("finished_at");
            entity.Property(e => e.ItemsScraped).HasColumnName("items_scraped");
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.StoreId).HasColumnName("store_id");

            entity.HasOne(d => d.Store).WithMany(p => p.ScraperRuns)
                .HasForeignKey(d => d.StoreId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("scraper_runs_store_id_fkey");
        });

        modelBuilder.Entity<SearchQuery>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("search_queries_pkey");

            entity.ToTable("search_queries");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.QueryText)
                .HasMaxLength(255)
                .HasColumnName("query_text");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.SearchQueries)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("search_queries_user_id_fkey");
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("sessions_pkey");

            entity.ToTable("sessions");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DeviceName)
                .HasMaxLength(120)
                .HasColumnName("device_name");
            entity.Property(e => e.IpAddress)
                .HasMaxLength(64)
                .HasColumnName("ip_address");
            entity.Property(e => e.LastActiveAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("last_active_at");
            entity.Property(e => e.RefreshTokenHash)
                .HasMaxLength(255)
                .HasColumnName("refresh_token_hash");
            entity.Property(e => e.RevokedAt).HasColumnName("revoked_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Sessions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("sessions_user_id_fkey");
        });

        modelBuilder.Entity<Store>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("stores_pkey");

            entity.ToTable("stores");

            entity.HasIndex(e => e.Name, "stores_name_key").IsUnique();

            entity.HasIndex(e => e.Slug, "stores_slug_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BaseUrl).HasColumnName("base_url");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Name)
                .HasMaxLength(80)
                .HasColumnName("name");
            entity.Property(e => e.Slug)
                .HasMaxLength(80)
                .HasColumnName("slug");
        });

        modelBuilder.Entity<StoreClick>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("store_clicks_pkey");

            entity.ToTable("store_clicks");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.StoreListingId).HasColumnName("store_listing_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.StoreListing).WithMany(p => p.StoreClicks)
                .HasForeignKey(d => d.StoreListingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("store_clicks_store_listing_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.StoreClicks)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("store_clicks_user_id_fkey");
        });

        modelBuilder.Entity<StoreListing>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("store_listings_pkey");

            entity.ToTable("store_listings");

            entity.HasIndex(e => e.ProductId, "idx_store_listings_product");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.InStock)
                .HasDefaultValue(true)
                .HasColumnName("in_stock");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ProductUrl).HasColumnName("product_url");
            entity.Property(e => e.RawTitle)
                .HasMaxLength(500)
                .HasColumnName("raw_title");
            entity.Property(e => e.ScrapedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("scraped_at");
            entity.Property(e => e.StoreId).HasColumnName("store_id");

            entity.HasOne(d => d.Product).WithMany(p => p.StoreListings)
                .HasForeignKey(d => d.ProductId)
                .HasConstraintName("store_listings_product_id_fkey");

            entity.HasOne(d => d.Store).WithMany(p => p.StoreListings)
                .HasForeignKey(d => d.StoreId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("store_listings_store_id_fkey");
        });

        modelBuilder.Entity<TeamRequest>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("team_requests_pkey");

            entity.ToTable("team_requests");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.InviteToken)
                .HasMaxLength(255)
                .HasColumnName("invite_token");
            entity.Property(e => e.InvitedBy).HasColumnName("invited_by");
            entity.Property(e => e.Name)
                .HasMaxLength(120)
                .HasColumnName("name");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");

            entity.HasOne(d => d.InvitedByNavigation).WithMany(p => p.TeamRequestInvitedByNavigations)
                .HasForeignKey(d => d.InvitedBy)
                .HasConstraintName("team_requests_invited_by_fkey");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.TeamRequestReviewedByNavigations)
                .HasForeignKey(d => d.ReviewedBy)
                .HasConstraintName("team_requests_reviewed_by_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.Location)
                .HasMaxLength(120)
                .HasColumnName("location");
            entity.Property(e => e.Name)
                .HasMaxLength(120)
                .HasColumnName("name");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(30)
                .HasColumnName("phone");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
        });

        modelBuilder.Entity<UserNotificationSetting>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("user_notification_settings_pkey");

            entity.ToTable("user_notification_settings");

            entity.Property(e => e.UserId)
                .ValueGeneratedNever()
                .HasColumnName("user_id");
            entity.Property(e => e.NewReports)
                .HasDefaultValue(true)
                .HasColumnName("new_reports");
            entity.Property(e => e.SyncFailures)
                .HasDefaultValue(true)
                .HasColumnName("sync_failures");
            entity.Property(e => e.WeeklySummaryEmail).HasColumnName("weekly_summary_email");

            entity.HasOne(d => d.User).WithOne(p => p.UserNotificationSetting)
                .HasForeignKey<UserNotificationSetting>(d => d.UserId)
                .HasConstraintName("user_notification_settings_user_id_fkey");
        });

        modelBuilder.Entity<VerificationCode>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("verification_codes_pkey");

            entity.ToTable("verification_codes");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CodeHash)
                .HasMaxLength(255)
                .HasColumnName("code_hash");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.UsedAt).HasColumnName("used_at");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
