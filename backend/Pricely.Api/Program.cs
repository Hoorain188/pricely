using Microsoft.EntityFrameworkCore;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ---------- Database ----------
// Connection string lives in user-secrets, never in appsettings.json:
//   dotnet user-secrets set "ConnectionStrings:Default" "Host=...;Database=neondb;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
var connString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is missing. Set it with dotnet user-secrets.");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connString, npgsql =>
    {
        // Postgres enums are declared here, on the EF options. Npgsql 9+ moved
        // this off NpgsqlDataSourceBuilder; registering them anywhere else
        // leaves EF sending integers and Postgres rejecting the query.
        npgsql.MapEnum<UserRole>("user_role");
        npgsql.MapEnum<MatchStatus>("listing_match_status");
        npgsql.MapEnum<ScraperRunStatus>("scraper_run_status");
        npgsql.MapEnum<TeamRequestStatus>("team_request_status");
        npgsql.MapEnum<TeamRequestType>("team_request_type");
        npgsql.MapEnum<VerificationPurpose>("verification_purpose");

        // Neon suspends idle databases; the first request after a pause needs
        // a few seconds and one or two retries to get through.
        npgsql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
    }));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IActivityLogger, ActivityLogger>();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// The React Native app calls this from a different origin.
builder.Services.AddCors(o => o.AddPolicy("app", p => p
    .AllowAnyOrigin()      // tighten to real domains before going live
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("app");
app.MapControllers();

app.Run();