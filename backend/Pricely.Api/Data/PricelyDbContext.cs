using Microsoft.EntityFrameworkCore;
using Pricely.Api.Models;

namespace Pricely.Api.Data;

public class PricelyDbContext : DbContext
{
    public PricelyDbContext(DbContextOptions<PricelyDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<VerificationCode> VerificationCodes => Set<VerificationCode>();
    public DbSet<TeamRequest> TeamRequests => Set<TeamRequest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tell EF these Postgres enum types exist. Table/column names come from
        // UseSnakeCaseNamingConvention() in Program.cs, so PasswordHash resolves
        // to password_hash automatically — no [Column] attributes needed.
        modelBuilder.HasPostgresEnum<UserRole>("user_role");
        modelBuilder.HasPostgresEnum<VerificationPurpose>("verification_purpose");
        modelBuilder.HasPostgresEnum<TeamRequestStatus>("team_request_status");
        modelBuilder.HasPostgresEnum<TeamRequestType>("team_request_type");

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(255);
            e.Property(u => u.Name).HasMaxLength(120);
            e.Property(u => u.PasswordHash).HasMaxLength(255);
        });

        modelBuilder.Entity<Session>(e =>
        {
            e.HasOne(s => s.User)
             .WithMany(u => u.Sessions)
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(s => s.RefreshTokenHash);
        });

        modelBuilder.Entity<VerificationCode>(e =>
        {
            // Lookups are always "newest usable code for this email + purpose".
            e.HasIndex(v => new { v.Email, v.Purpose });
        });

        modelBuilder.Entity<TeamRequest>(e =>
        {
            e.HasOne(t => t.User)
             .WithMany()
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(t => t.Status);
        });

        base.OnModelCreating(modelBuilder);
    }
}
