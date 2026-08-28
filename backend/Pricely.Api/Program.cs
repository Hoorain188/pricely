using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pricely.Api.Authorization;
using Pricely.Api.Middleware;
using Pricely.Api.Services;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

// Load environment variables from .env file if available
var envFiles = new[] { ".env", Path.Combine("..", ".env"), Path.Combine("..", "..", ".env") };
foreach (var envPath in envFiles)
{
    if (File.Exists(envPath))
    {
        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#")) continue;
            var parts = trimmed.Split('=', 2);
            if (parts.Length == 2)
            {
                var key = parts[0].Trim();
                var val = parts[1].Trim().Trim('"').Trim('\'');
                Environment.SetEnvironmentVariable(key, val);
            }
        }
    }
}

var builder = WebApplication.CreateBuilder(args);

// Keep JWT claims exactly as they were written ("sub" stays "sub" rather than
// being rewritten to a long schema URL), so reading them back is predictable.
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// ── Database ─────────────────────────────────────────────────────────────
string? GetNonEmpty(params string?[] candidates)
{
    foreach (var c in candidates)
    {
        if (!string.IsNullOrWhiteSpace(c)) return c;
    }
    return null;
}

var connString = GetNonEmpty(
    builder.Configuration.GetConnectionString("Default"),
    builder.Configuration.GetConnectionString("Postgres"),
    Environment.GetEnvironmentVariable("NEON_DATABASE_URL"),
    Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection"),
    Environment.GetEnvironmentVariable("ConnectionStrings__Default")
) ?? throw new InvalidOperationException(
    "ConnectionStrings:Default is missing. Set NEON_DATABASE_URL in .env or ConnectionStrings:Default with dotnet user-secrets.");

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

// ── Hangfire (scraper job scheduling) ────────────────────────────────────
builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connString)));
builder.Services.AddHangfireServer();

// ── Options ──────────────────────────────────────────────────────────────

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));

// ── Authentication ───────────────────────────────────────────────────────

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Without this the handler rewrites "sub" to the long WS-Federation
        // claim URI on the way in, and every lookup by "sub" comes back null.
        // Clearing the static DefaultInboundClaimTypeMap alone is not enough.
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(jwt.SigningKey)
                    ? new string('0', 32)   // placeholder; TokenService throws a clear error if it's unset
                    : jwt.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = ClaimNames.Name,
            RoleClaimType = ClaimNames.Role
        };
    });

// ── Authorisation ────────────────────────────────────────────────────────
// Every back-office policy goes through ActiveBackOfficeHandler, which re-reads
// the user's row rather than trusting the role inside the token — so demoting
// or deactivating someone takes effect immediately, not whenever their token
// happens to expire.
builder.Services.AddScoped<IAuthorizationHandler, ActiveBackOfficeHandler>();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.BackOffice, policy => policy
        .RequireAuthenticatedUser()
        .AddRequirements(new ActiveBackOfficeRequirement(
            UserRole.Admin, UserRole.Support, UserRole.ReadOnly)));

    // Read-only has no Users/Team screen at all, so it isn't listed here.
    options.AddPolicy(Policies.TeamView, policy => policy
        .RequireAuthenticatedUser()
        .AddRequirements(new ActiveBackOfficeRequirement(UserRole.Admin, UserRole.Support)));

    options.AddPolicy(Policies.BackOfficeWrite, policy => policy
        .RequireAuthenticatedUser()
        .AddRequirements(new ActiveBackOfficeRequirement(UserRole.Admin, UserRole.Support)));

    options.AddPolicy(Policies.AdminOnly, policy => policy
        .RequireAuthenticatedUser()
        .AddRequirements(new ActiveBackOfficeRequirement(UserRole.Admin)));
});

// ── Rate limiting ────────────────────────────────────────────────────────
// Auth endpoints are the ones worth guessing against, so they get tight
// per-IP budgets. Without this, nothing stops thousands of login attempts.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            """{"code":"rate_limited","message":"Too many attempts. Please wait a minute and try again."}""",
            ct);
    };

    // Aam users: 100 requests per minute (per IP)
    options.AddPolicy("api", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Search thoda kam (mehnga hai): 30 per minute
    options.AddPolicy("search", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Sync/admin: sirf 5 per hour (bohot mehnge kaam)
    options.AddPolicy("heavy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            }));

    // Sign-in and code entry: the brute-force targets.
    options.AddPolicy(RateLimitPolicies.Sensitive, http =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ClientKey(http),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    // Anything that sends an email — stops the API being used as a spam relay
    // against someone else's inbox.
    options.AddPolicy(RateLimitPolicies.EmailSending, http =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ClientKey(http),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    static string ClientKey(HttpContext http) =>
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
});

// ── Services ─────────────────────────────────────────────────────────────

// Admin side
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IActivityLogger, ActivityLogger>();

// Scrapers (moved from PriceCompare.Api)
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("ScraperClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddScoped<TelemartSyncService>();
builder.Services.AddScoped<MegaPkSyncService>();
builder.Services.AddScoped<DarazSyncService>();
builder.Services.AddScoped<DeduplicationService>();
builder.Services.AddScoped<IStoreConnector, TelemartSyncService>();
builder.Services.AddScoped<IStoreConnector, MegaPkSyncService>();
builder.Services.AddScoped<IStoreConnector, DarazSyncService>();
// Auth side
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TeamService>();
builder.Services.AddScoped<MonitoredSyncService>();

// Real mail is the default. The console fallback is only allowed while
// developing and only when Gmail genuinely isn't configured yet, so a
// misconfigured deployment fails loudly instead of silently sending nothing.
var email = builder.Configuration.GetSection(EmailOptions.SectionName).Get<EmailOptions>() ?? new EmailOptions();
var emailConfigured = !string.IsNullOrWhiteSpace(email.FromAddress)
                      && !string.IsNullOrWhiteSpace(email.SmtpPassword);

if (emailConfigured)
{
    builder.Services.AddScoped<IEmailSender, GmailEmailSender>();
}
else if (builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<IEmailSender, LoggingEmailSender>();
}
else
{
    throw new InvalidOperationException(
        "Email:FromAddress and Email:SmtpPassword must be set outside Development. " +
        "See backend/README.md.");
}

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        // Accept and emit enums as names ("Admin") rather than the numbers
        // they'd otherwise be, so the app can send {"portal": "Admin"} and
        // read {"role": "admin"} instead of hard-coding indexes.
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
    });

// Model-validation failures otherwise return ASP.NET's default ProblemDetails,
// which is both a different shape from every other error the API returns and
// leaks internal type names (e.g. "could not be converted to
// Pricely.Api.Dtos.ChangeRoleRequest"). This makes them look like the rest.
// Must be registered AFTER AddControllers, or its own setup overwrites this.
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var message = context.ModelState
            // Keys starting with "$" are JSON-parse positions and the bare
            // action-parameter name ("req") is an implementation detail — both
            // produce messages that mean nothing to whoever is using the app.
            .Where(kvp => !kvp.Key.StartsWith('$') && kvp.Key != "req")
            .SelectMany(kvp => kvp.Value?.Errors ?? Enumerable.Empty<ModelError>())
            .Select(e => e.ErrorMessage)
            .FirstOrDefault(m => !string.IsNullOrWhiteSpace(m) && !m.Contains("Pricely.Api"))
            ?? "Some of those details aren't valid. Please check and try again.";

        return new BadRequestObjectResult(new { code = "validation_error", message });
    };
});

builder.Services.AddOpenApi();

// The React Native app calls this from a different origin.
builder.Services.AddCors(o => o.AddPolicy("app", p => p
    .AllowAnyOrigin()      // tighten to real domains before going live
    .AllowAnyHeader()
    .AllowAnyMethod()));

// ============================================================
//  RESPONSE CACHING — DB par bojh kam, app tez
// ============================================================
builder.Services.AddOutputCache(options =>
{
    // Browse — 2 minute (category/store/seed/page ke hisaab se alag cache)
    options.AddPolicy("browse", b => b
        .Expire(TimeSpan.FromMinutes(2))
        .SetVaryByQuery("category", "store", "seed", "page", "pageSize"));

    // Product groups — 5 minute (kam badalte hain)
    options.AddPolicy("groups", b => b
        .Expire(TimeSpan.FromMinutes(5))
        .SetVaryByQuery("category"));

    // Store categories — 10 minute (bohot kam badalte)
    options.AddPolicy("categories", b => b
        .Expire(TimeSpan.FromMinutes(10))
        .SetVaryByQuery("store"));
});

var app = builder.Build();

// ── Pipeline ─────────────────────────────────────────────────────────────
// Order matters. The exception handler goes first so it wraps everything
// below it, and authentication must run before authorisation — otherwise
// policies evaluate against an anonymous user and every admin route 401s.

// Global error handler — crash par saaf message, internal details nahi
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        
        // Log mein poori tafseel (developer ke liye)
        if (feature?.Error != null)
            app.Logger.LogError(feature.Error, "Unhandled error on {Path}", context.Request.Path);

        // User ko sirf saaf message
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(
            """{"error":"Something went wrong. Please try again later."}""");
    });
});

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (!emailConfigured)
{
    app.Logger.LogWarning(
        "Gmail is not configured — verification codes will be printed to this console " +
        "instead of emailed. Set Email:FromAddress and Email:SmtpPassword to send real mail.");
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseRouting();
app.UseCors("app");
app.UseRateLimiter();
app.UseOutputCache();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Clean up leftover jobs from old PriceCompare.Api assembly ─────────────
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.ExecuteSqlRawAsync(@"
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job' AND table_schema = 'hangfire') THEN
                DELETE FROM hangfire.job WHERE invocationdata::text LIKE '%PriceCompare.Api%';
            ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job' AND table_schema = 'public') THEN
                DELETE FROM public.job WHERE invocationdata::text LIKE '%PriceCompare.Api%';
            END IF;
        END $$;
    ");
}
catch (Exception ex)
{
    app.Logger.LogWarning("Hangfire legacy job cleanup skipped: {Msg}", ex.Message);
}

// ── DB warmup — wake Neon from sleep so first user request is fast ────────
try
{
    using var warmupScope = app.Services.CreateScope();
    var warmupDb = warmupScope.ServiceProvider.GetRequiredService<AppDbContext>();
    var listingCount = await warmupDb.StoreListings.CountAsync();
    app.Logger.LogInformation("DB warmup done — {Count} listings in database", listingCount);
}
catch (Exception ex)
{
    app.Logger.LogWarning("DB warmup failed (Neon may still be waking): {Msg}", ex.Message);
}

// ── Hangfire dashboard (secured with Basic Auth) ──────────────────────────
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthFilter() }
});

// Automatic recurring scrapers disabled as requested — scrapers run ONLY when manually triggered
try
{
    RecurringJob.RemoveIfExists("telemart-sync");
    RecurringJob.RemoveIfExists("megapk-sync");
    RecurringJob.RemoveIfExists("daraz-sync");

    // Deduplication har roz raat 2 baje khud chale (sab syncs ke baad)
    RecurringJob.AddOrUpdate<DeduplicationService>(
        "deduplication", s => s.RunDeduplicationAsync(), "0 2 * * *");
}
catch (Exception ex)
{
    app.Logger.LogWarning("RecurringJob cleanup/setup skipped: {Msg}", ex.Message);
}


// ══════════════════════════════════════════════════════════════════════════
//  CUSTOMER-FACING MINIMAL API ENDPOINTS (moved from PriceCompare.Api)
// ══════════════════════════════════════════════════════════════════════════

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
app.MapGet("/health", async (AppDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
            return Results.Json(new { status = "unhealthy", database = "disconnected" },
                                statusCode: 503);

        var listings = await db.StoreListings.CountAsync();
        var stores = await db.Stores.CountAsync();

        return Results.Ok(new
        {
            status = "healthy",
            database = "connected",
            listings,
            stores,
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new { status = "unhealthy", error = ex.Message },
                            statusCode: 503);
    }
});


// ── BROWSE — category products (store filter + round-robin + seed) ───────
app.MapGet("/api/browse", async (
    string category, string? store, int? seed, int? page, int? pageSize, AppDbContext db) =>
{
    var cat = NormalizeCategory(category);
    var pg = Math.Max(1, page ?? 1);
    var size = Math.Clamp(pageSize ?? 60, 10, 200);
    var offset = (pg - 1) * size;
    var rotationSeed = seed ?? 0;

    var hasStore = !string.IsNullOrWhiteSpace(store);
    var storeClean = hasStore ? store!.Trim().ToLower() : "";

    var storeFilter = hasStore
        ? "AND (LOWER(s.name) = {1} OR LOWER(s.slug) = {1})"
        : "";

    var sql = $@"
        SELECT sl.id, sl.raw_title, s.name AS store, sl.price,
               sl.product_url, sl.image_url,
               CASE WHEN c.store_listing_id IS NOT NULL THEN true ELSE false END AS has_comparison
        FROM store_listings sl
        JOIN stores s ON s.id = sl.store_id
        LEFT JOIN (
            SELECT DISTINCT mgl.store_listing_id
            FROM match_group_listings mgl
            WHERE mgl.match_group_id IN (
                SELECT mgl2.match_group_id
                FROM match_group_listings mgl2
                JOIN store_listings sl2 ON sl2.id = mgl2.store_listing_id
                GROUP BY mgl2.match_group_id
                HAVING COUNT(DISTINCT sl2.store_id) >= 2
            )
        ) c ON c.store_listing_id = sl.id
        WHERE sl.category = {{0}} {storeFilter}
        ORDER BY has_comparison DESC,
                 md5(sl.id::text || '{rotationSeed}')
        LIMIT {size} OFFSET {offset};";

    var rows = hasStore
        ? await db.Database.SqlQueryRaw<BrowseRow>(sql, cat, storeClean).ToListAsync()
        : await db.Database.SqlQueryRaw<BrowseRow>(sql, cat).ToListAsync();

    var countSql = $@"
        SELECT COUNT(*) AS ""Value"" FROM store_listings sl
        JOIN stores s ON s.id = sl.store_id
        WHERE sl.category = {{0}} {storeFilter};";

    var total = hasStore
        ? (await db.Database.SqlQueryRaw<long>(countSql, cat, storeClean).ToListAsync()).First()
        : (await db.Database.SqlQueryRaw<long>(countSql, cat).ToListAsync()).First();

    return Results.Ok(new
    {
        Source = "database",
        Page = pg,
        PageSize = size,
        Total = total,
        TotalPages = (int)Math.Ceiling(total / (double)size),
        HasMore = offset + rows.Count < total,
        Results = rows.Select(r => new
        {
            id = r.id,
            title = r.raw_title,
            store = r.store,
            price = r.price.ToString(),
            currency = "PKR",
            url = r.product_url,
            imageUrl = r.image_url,
            hasComparison = r.has_comparison
        })
    });
}).RequireRateLimiting("api").CacheOutput("browse");


// ─── PRICE HISTORY — kisi listing ka price safar ───────────────────
app.MapGet("/api/price-history", async (long listingId, int? days, AppDbContext db) =>
{
    var since = DateTime.UtcNow.AddDays(-(days ?? 30));

    var history = await db.Database.SqlQueryRaw<HistoryRow>(@"
        SELECT ph.price, ph.recorded_at
        FROM price_history ph
        WHERE ph.store_listing_id = {0} AND ph.recorded_at >= {1}
        ORDER BY ph.recorded_at ASC;", listingId, since).ToListAsync();

    var current = await db.StoreListings
        .Where(l => l.Id == listingId)
        .Select(l => new { l.Price, l.ScrapedAt })
        .FirstOrDefaultAsync();

    if (current == null)
        return Results.NotFound(new { error = "Listing nahi mili" });

    var points = history
        .Select(h => new { price = h.price, date = h.recorded_at })
        .ToList();

    points.Add(new { price = current.Price, date = current.ScrapedAt.UtcDateTime });

    // Consecutive same-price points hatao (graph saaf rahe)
    var cleaned = new List<object>();
    decimal? lastPrice = null;
    foreach (var p in points.OrderBy(x => x.date))
    {
        if (lastPrice != p.price)
        {
            cleaned.Add(new { price = p.price, date = p.date });
            lastPrice = p.price;
        }
    }

    var prices = points.Select(p => p.price).ToList();

    return Results.Ok(new
    {
        hasHistory = points.Count > 1,
        currentPrice = current.Price,
        lowestPrice = prices.Min(),
        highestPrice = prices.Max(),
        averagePrice = Math.Round(prices.Average(), 0),
        pointCount = cleaned.Count,
        points = cleaned
    });
}).RequireRateLimiting("api");

app.MapGet("/api/store-categories", async (string store, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(store))
        return Results.BadRequest("store khaali nahi ho sakta");

    var storeClean = store.Trim().ToLower();

    var cats = await db.StoreListings
        .Where(l => (l.Store.Name.ToLower() == storeClean || l.Store.Slug.ToLower() == storeClean)
                    && l.Category != null
                    && l.Price > 0)
        .GroupBy(l => l.Category)
        .Select(g => new { category = g.Key, count = g.Count() })
        .OrderByDescending(x => x.count)
        .ToListAsync();

    return Results.Ok(cats);
}).RequireRateLimiting("api").CacheOutput("categories");


// ── SEARCH — combined category + title search ────────────────────────────
app.MapGet("/api/search", async (string q, string? store, IHttpClientFactory httpFactory, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(q))
        return Results.BadRequest("q khaali nahi ho sakta");

    var queryClean = q.Trim().ToLower();
    var keywords = queryClean.Split(' ', StringSplitOptions.RemoveEmptyEntries);

    var baseQuery = db.StoreListings.AsQueryable().Where(l => l.Price > 0);
    if (!string.IsNullOrWhiteSpace(store))
    {
        var storeClean = store.Trim().ToLower();
        baseQuery = baseQuery.Where(l => l.Store.Name.ToLower() == storeClean
                                       || l.Store.Slug.ToLower() == storeClean);
    }

    var fromDbRaw = await baseQuery
        .Where(l => l.Category == queryClean
                 || (keywords.Length > 0 && keywords.All(kw => l.RawTitle.ToLower().Contains(kw))))
        .OrderByDescending(l => l.Price)
        .Take(100)
        .Select(l => new { l.Id, l.RawTitle, StoreName = l.Store.Name, l.Price, l.ProductUrl, l.ImageUrl })
        .ToListAsync();

    if (fromDbRaw.Count == 0 && keywords.Length > 1)
    {
        fromDbRaw = await baseQuery
            .Where(l => keywords.Any(kw => l.RawTitle.ToLower().Contains(kw)))
            .OrderByDescending(l => l.Price)
            .Take(100)
            .Select(l => new { l.Id, l.RawTitle, StoreName = l.Store.Name, l.Price, l.ProductUrl, l.ImageUrl })
            .ToListAsync();
    }

    var comparedIds = await db.Database
        .SqlQueryRaw<long>(@"
            SELECT DISTINCT mgl.store_listing_id AS ""Value""
            FROM match_group_listings mgl
            JOIN match_group_listings mgl2 ON mgl2.match_group_id = mgl.match_group_id
            JOIN store_listings sl ON sl.id = mgl.store_listing_id
            JOIN store_listings sl2 ON sl2.id = mgl2.store_listing_id
            WHERE sl.store_id <> sl2.store_id;")
        .ToListAsync();

    var comparedSet = comparedIds.ToHashSet();

    var fromDb = fromDbRaw
        .OrderByDescending(x => comparedSet.Contains(x.Id))   // 1) compare wale PEHLE
        .ThenByDescending(x => x.Price)                        // 2) phir mehnge (asli products)
        .Select(x => ToOffer(x.Id, x.RawTitle, x.StoreName, x.Price, x.ProductUrl, x.ImageUrl, comparedSet.Contains(x.Id)))
        .ToList();

    if (fromDb.Count > 0)
        return Results.Ok(new { Source = "database", Results = fromDb });

    // Fallback: live Telemart search API
    var http = httpFactory.CreateClient();
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

    var url = $"https://www.telemart.pk/search/suggest.json" +
              $"?q={Uri.EscapeDataString(q)}&resources[type]=product&resources[limit]=10";

    var offers = new List<Offer>();
    try
    {
        var json = await http.GetStringAsync(url);
        using var doc = JsonDocument.Parse(json);
        var products = doc.RootElement.GetProperty("resources").GetProperty("results").GetProperty("products");

        foreach (var p in products.EnumerateArray())
        {
            var title  = p.GetProperty("title").GetString() ?? "";
            var handle = p.TryGetProperty("handle", out var h) ? h.GetString() : "";
            var priceStr = p.TryGetProperty("price", out var pr) ? pr.GetString() : "0";
            var image  = p.TryGetProperty("image", out var img) ? img.GetString() : null;
            decimal.TryParse(priceStr, out var price);
            offers.Add(new Offer(0, title, "Telemart", price.ToString(), "PKR",
                handle ?? "", $"https://www.telemart.pk/products/{handle}", image));
        }
    }
    catch (Exception ex)
    {
        return Results.Problem($"Telemart search mein masla: {ex.Message}");
    }

    return Results.Ok(new { Source = "telemart-live", Results = offers });
}).RequireRateLimiting("search");


// ── MANUAL SYNC TRIGGER ──────────────────────────────────────────────────
app.MapPost("/api/sync-telemart", (HttpContext ctx, IConfiguration config) =>
{
    if (!IsAdminRequest(ctx, config))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);

    BackgroundJob.Enqueue<MonitoredSyncService>(s => s.RunWithMonitoringAsync("telemart"));
    return Results.Ok(new { Message = "Telemart sync background task shuru ho gayi hai." });
}).RequireRateLimiting("heavy");

app.MapPost("/api/sync-megapk", (HttpContext ctx, IConfiguration config) =>
{
    if (!IsAdminRequest(ctx, config))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);

    BackgroundJob.Enqueue<MonitoredSyncService>(s => s.RunWithMonitoringAsync("megapk"));
    return Results.Ok(new { Message = "Mega.pk sync background task shuru ho gayi hai." });
}).RequireRateLimiting("heavy");

app.MapPost("/api/sync-daraz", (HttpContext ctx, IConfiguration config) =>
{
    if (!IsAdminRequest(ctx, config))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);

    BackgroundJob.Enqueue<MonitoredSyncService>(s => s.RunWithMonitoringAsync("daraz"));
    return Results.Ok(new { Message = "Daraz sync queue mein daal diya." });
}).RequireRateLimiting("heavy");

app.MapPost("/api/sync-all", (HttpContext ctx, IConfiguration config, IBackgroundJobClient jobs, IEnumerable<IStoreConnector> connectors) =>
{
    if (!IsAdminRequest(ctx, config))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);

    foreach (var connector in connectors)
    {
        if (connector is TelemartSyncService)
            jobs.Enqueue<TelemartSyncService>(s => s.SyncAllProductsAsync());
        else if (connector is MegaPkSyncService)
            jobs.Enqueue<MegaPkSyncService>(s => s.SyncAllProductsAsync());
        else if (connector is DarazSyncService)
            jobs.Enqueue<DarazSyncService>(s => s.SyncAllProductsAsync());
    }
    var names = string.Join(", ", connectors.Select(c => c.StoreName));
    return Results.Ok(new { Message = $"Sab stores sync queue mein: {names}" });
}).RequireRateLimiting("heavy");


// ─── SCRAPER RUNS — sync ka haal (admin dashboard ke liye) ───────────
app.MapGet("/api/scraper-runs", async (int? limit, AppDbContext db) =>
{
    var take = Math.Clamp(limit ?? 20, 1, 100);

    var runs = await db.Database.SqlQuery<ScraperRunRow>($@"
        SELECT sr.id, s.name AS store_name, sr.status::text AS status,
               sr.items_scraped, sr.error_message, sr.started_at, sr.finished_at
        FROM scraper_runs sr
        JOIN stores s ON s.id = sr.store_id
        ORDER BY sr.started_at DESC
        LIMIT {take};").ToListAsync();

    return Results.Ok(new
    {
        Count = runs.Count,
        Runs = runs.Select(r => new
        {
            r.id,
            store = r.store_name,
            r.status,
            itemsScraped = r.items_scraped,
            error = r.error_message,
            startedAt = r.started_at,
            finishedAt = r.finished_at,
            durationMinutes = r.finished_at.HasValue
                ? Math.Round((r.finished_at.Value - r.started_at).TotalMinutes, 1)
                : (double?)null
        })
    });
}).RequireRateLimiting("api");


app.MapPost("/api/run-deduplication", (HttpContext ctx, IConfiguration config) =>
{
    if (!IsAdminRequest(ctx, config))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);

    BackgroundJob.Enqueue<DeduplicationService>(s => s.RunDeduplicationAsync());
    return Results.Ok(new { Message = "Deduplication queue mein daal diya. Logs dekhein." });
}).RequireRateLimiting("heavy");

// Ek product group ki saari store listings (comparison ke liye)
app.MapGet("/api/product-groups", async (string? category, AppDbContext db) =>
{
    // Sirf wo groups jinme 2+ ALAG stores hain
    var query = @"
        SELECT mg.id AS group_id,
               sl.raw_title, s.name AS store, sl.price,
               sl.image_url, sl.product_url, sl.category
        FROM match_groups mg
        JOIN match_group_listings mgl ON mgl.match_group_id = mg.id
        JOIN store_listings sl ON sl.id = mgl.store_listing_id
        JOIN stores s ON s.id = sl.store_id
        WHERE mg.id IN (
            SELECT mgl2.match_group_id
            FROM match_group_listings mgl2
            JOIN store_listings sl2 ON sl2.id = mgl2.store_listing_id
            GROUP BY mgl2.match_group_id
            HAVING COUNT(DISTINCT sl2.store_id) >= 2
        )
        ORDER BY mg.id, sl.price ASC;";

    var rows = await db.Database.SqlQueryRaw<GroupRow>(query).ToListAsync();

    var grouped = rows
        .Where(r => category == null || r.category == category)
        .GroupBy(r => r.group_id)
        .Select(g => new
        {
            GroupId = g.Key,
            Title = g.First().raw_title,
            Image = g.First().image_url,
            Category = g.First().category,
            LowestPrice = g.Min(x => x.price),
            StoreCount = g.Select(x => x.store).Distinct().Count(),
            Offers = g.GroupBy(x => x.store)
                      .Select(sg => sg.OrderBy(x => x.price).First())
                      .OrderBy(x => x.price)
                      .Select(x => new
                      {
                          Store = x.store,
                          Price = x.price,
                          Url = x.product_url
                      })
        })
        .OrderByDescending(x => x.StoreCount)
        .Take(100)
        .ToList();

    return Results.Ok(new { Count = grouped.Count, Groups = grouped });
}).RequireRateLimiting("api").CacheOutput("groups");


// Ek listing ka comparison — us ke group ke saare stores ke daam
app.MapGet("/api/compare", async (long? listingId, string? title, AppDbContext db) =>
{
    try
    {
        long targetGroupId = 0;

        if (listingId.HasValue && listingId.Value > 0)
        {
            var mgl = await db.MatchGroupListings.FirstOrDefaultAsync(l => l.StoreListingId == listingId.Value);
            if (mgl != null) targetGroupId = mgl.MatchGroupId;
        }

        if (targetGroupId == 0 && !string.IsNullOrWhiteSpace(title))
        {
            var cleanTitle = title.Trim().ToLower();
            var mgl = await db.MatchGroupListings
                .FirstOrDefaultAsync(m => m.StoreListing.RawTitle.ToLower().Contains(cleanTitle));
            if (mgl != null)
            {
                targetGroupId = mgl.MatchGroupId;
            }
            else
            {
                var key = DeduplicationService.BuildMatchKey(title);
                if (!string.IsNullOrEmpty(key))
                {
                    var keyWords = key.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (keyWords.Length > 0)
                    {
                        var candidate = await db.MatchGroupListings
                            .FirstOrDefaultAsync(m => keyWords.All(w => m.StoreListing.RawTitle.ToLower().Contains(w)));
                        if (candidate != null) targetGroupId = candidate.MatchGroupId;
                    }
                }
            }
        }

        if (targetGroupId == 0)
            return Results.Ok(new { HasComparison = false, Offers = new List<object>() });

        var listings = await db.MatchGroupListings
            .Where(mgl => mgl.MatchGroupId == targetGroupId)
            .Select(mgl => new {
                Store = mgl.StoreListing.Store.Name,
                Price = mgl.StoreListing.Price,
                Url = mgl.StoreListing.ProductUrl
            })
            .ToListAsync();

        var offers = listings
            .GroupBy(x => x.Store)
            .Select(g => g.OrderBy(x => x.Price).First())
            .OrderBy(x => x.Price)
            .Select(x => new { Store = x.Store, Price = x.Price, Url = x.Url })
            .ToList();

        return Results.Ok(new
        {
            HasComparison = offers.Count > 1,
            LowestPrice = offers.Count > 0 ? offers.Min(o => o.Price) : 0,
            Offers = offers
        });
    }
    catch
    {
        return Results.Ok(new { HasComparison = false, Offers = new List<object>() });
    }
}).RequireRateLimiting("api");


// ── TELEMART PRODUCT DETAIL — live ───────────────────────────────────────
app.MapGet("/api/product/{handle}", async (string handle, IHttpClientFactory httpFactory) =>
{
    var http = httpFactory.CreateClient("ScraperClient");
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

    try
    {
        var safeHandle = Uri.EscapeDataString(handle);
        var json = await http.GetStringAsync($"https://www.telemart.pk/products/{safeHandle}.json");
        using var doc = JsonDocument.Parse(json);
        var product = doc.RootElement.GetProperty("product");

        var images = new List<string>();
        if (product.TryGetProperty("images", out var imgs))
            foreach (var img in imgs.EnumerateArray())
                if (img.TryGetProperty("src", out var src))
                    images.Add(src.GetString() ?? "");

        var variants = new List<object>();
        if (product.TryGetProperty("variants", out var vars))
            foreach (var vr in vars.EnumerateArray())
                variants.Add(new
                {
                    Title = vr.TryGetProperty("title", out var vt) ? vt.GetString() : "",
                    Price = vr.TryGetProperty("price", out var vp) ? vp.GetString() : "0",
                    Available = vr.TryGetProperty("available", out var va) && va.GetBoolean()
                });

        return Results.Ok(new
        {
            Title       = product.GetProperty("title").GetString(),
            Store       = "Telemart",
            Description = product.TryGetProperty("body_html", out var b) ? b.GetString() : "",
            Brand       = product.TryGetProperty("vendor", out var v) ? v.GetString() : "",
            Images      = images,
            Variants    = variants,
            Url         = $"https://www.telemart.pk/products/{safeHandle}"
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Telemart detail mein masla: {ex.Message}");
    }
}).RequireRateLimiting("search");


// ── MEGA.PK PRODUCT DETAIL — live (HTML + DB fallback) ───────────────────
app.MapGet("/api/megapk-product", async (string url, IHttpClientFactory httpFactory, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(url))
        return Results.BadRequest("Sahi Mega.pk product URL do (?url=...)");

    var cleanUrl = url.Trim();
    if (!cleanUrl.StartsWith("http://") && !cleanUrl.StartsWith("https://"))
    {
        cleanUrl = "https://www.mega.pk/" + cleanUrl.TrimStart('/');
    }

    if (!Uri.TryCreate(cleanUrl, UriKind.Absolute, out var uri) ||
        (uri.Host != "mega.pk" && !uri.Host.EndsWith(".mega.pk", StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest("Sirf valid Mega.pk URLs allowed hain.");
    }

    var http = httpFactory.CreateClient("ScraperClient");
    http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    try
    {
        var response = await http.GetAsync(cleanUrl);
        if (!response.IsSuccessStatusCode)
        {
            var listing = await db.StoreListings.FirstOrDefaultAsync(l => l.ProductUrl == url || l.ProductUrl == cleanUrl);
            return Results.Ok(new
            {
                Title = listing?.RawTitle ?? "Mega.pk Product",
                Store = "Mega.pk",
                Price = (listing?.Price ?? 0).ToString(),
                Brand = "Mega.pk",
                Images = new List<string> { listing?.ImageUrl ?? "" },
                Specs = new List<object>(),
                Url = cleanUrl
            });
        }

        var html = await response.Content.ReadAsStringAsync();

        var titleM = Regex.Match(html, @"<h2 class=""product-title""\s*>(.*?)</h2>", RegexOptions.Singleline);
        var title = titleM.Success ? CleanText(titleM.Groups[1].Value) : "";

        var imgM = Regex.Match(html, @"<img[^>]*id=""main-prod-img""[^>]*>", RegexOptions.Singleline);
        var mainImage = "";
        if (imgM.Success)
        {
            var srcM = Regex.Match(imgM.Value, @"src=""([^""]+)""");
            if (srcM.Success) mainImage = srcM.Groups[1].Value;
        }

        decimal price = 0;
        var priceM = Regex.Match(html, @"og:description""\s+content=""[^""]*is Rs\.?\s*([\d,]+(?:\.\d+)?)", RegexOptions.IgnoreCase);
        if (!priceM.Success)
            priceM = Regex.Match(html, @"<strong>\s*([\d,]+)\s*-\s*PKR", RegexOptions.IgnoreCase);
        if (priceM.Success)
            decimal.TryParse(priceM.Groups[1].Value.Replace(",", ""), out price);

        var brandM = Regex.Match(html, @"product:brand""\s+content=""([^""]+)""", RegexOptions.IgnoreCase);
        var brand = brandM.Success ? brandM.Groups[1].Value : "";

        var specs = new List<object>();
        var tableM = Regex.Match(html, @"<table id=""laptop_detail""[^>]*>(.*?)</table>", RegexOptions.Singleline);
        if (tableM.Success)
        {
            var rows = Regex.Matches(tableM.Groups[1].Value, @"<tr>(.*?)</tr>", RegexOptions.Singleline);
            foreach (Match row in rows)
            {
                var cells = Regex.Matches(row.Groups[1].Value, @"<t[dh][^>]*>(.*?)</t[dh]>", RegexOptions.Singleline);
                if (cells.Count == 2)
                {
                    var label = CleanText(cells[0].Groups[1].Value);
                    var value = CleanText(cells[1].Groups[1].Value);
                    if (!string.IsNullOrWhiteSpace(label))
                        specs.Add(new { Label = label, Value = value });
                }
            }
        }

        return Results.Ok(new
        {
            Title = string.IsNullOrWhiteSpace(title) ? "Mega.pk Product" : title,
            Store = "Mega.pk",
            Price = price.ToString(),
            Brand = brand,
            Images = new List<string> { mainImage },
            Specs = specs,
            Url = cleanUrl
        });
    }
    catch (Exception)
    {
        var listing = await db.StoreListings.FirstOrDefaultAsync(l => l.ProductUrl == url || l.ProductUrl == cleanUrl);
        return Results.Ok(new
        {
            Title = listing?.RawTitle ?? "Mega.pk Product",
            Store = "Mega.pk",
            Price = (listing?.Price ?? 0).ToString(),
            Brand = "Mega.pk",
            Images = new List<string> { listing?.ImageUrl ?? "" },
            Specs = new List<object>(),
            Url = cleanUrl
        });
    }
}).RequireRateLimiting("search");


// ── DARAZ PRODUCT DETAIL — live (SEO gallery se images + basic info) ──────
app.MapGet("/api/daraz-product", async (string url, IHttpClientFactory httpFactory) =>
{
    if (string.IsNullOrWhiteSpace(url) || !url.Contains("daraz.pk"))
        return Results.BadRequest("Sahi Daraz product URL do (?url=...)");

    var http = httpFactory.CreateClient();
    http.DefaultRequestHeaders.Add("User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36");

    try
    {
        var html = await http.GetStringAsync(url);

        // --- Images: seo-gallery se saari image URLs nikaalo ---
        var images = new List<string>();
        var imgMatches = Regex.Matches(html,
            @"<img[^>]*src=""(https://img\.drz\.lazcdn\.com/static/[^""]+\.webp)""",
            RegexOptions.IgnoreCase);
        foreach (Match m in imgMatches)
        {
            var imgUrl = m.Groups[1].Value;
            if (!images.Contains(imgUrl))   // duplicate na aaye (gallery + hidden dono mein hain)
                images.Add(imgUrl);
        }

        // --- Basic info: pdpTrackingData JSON se ---
        string title = "";
        string price = "";
        string brand = "";
        string category = "";

        var pdpMatch = Regex.Match(html,
            @"var pdpTrackingData = ""(.*?)"";", RegexOptions.Singleline);
        if (pdpMatch.Success)
        {
            // ye escaped JSON string hai — decode karo
            var raw = pdpMatch.Groups[1].Value
                .Replace("\\\"", "\"")
                .Replace("\\\\", "\\");
            try
            {
                using var doc = JsonDocument.Parse(raw);
                var root = doc.RootElement;
                if (root.TryGetProperty("pdt_name", out var n)) title = n.GetString() ?? "";
                if (root.TryGetProperty("pdt_price", out var p)) price = p.GetString() ?? "";
                if (root.TryGetProperty("brand_name", out var b)) brand = b.GetString() ?? "";
                if (root.TryGetProperty("pdt_category", out var c) && c.ValueKind == JsonValueKind.Array)
                    category = string.Join(" > ", c.EnumerateArray().Select(x => x.GetString()));
            }
            catch { /* JSON parse fail — basic info khaali reh jaye, images to hain */ }
        }

        // Title agar na mila to og:title se try karo
        if (string.IsNullOrWhiteSpace(title))
        {
            var t = Regex.Match(html, @"og:title""\s+content=""([^""]+)""", RegexOptions.IgnoreCase);
            if (t.Success) title = t.Groups[1].Value;
        }

        return Results.Ok(new
        {
            Title    = title,
            Store    = "Daraz",
            Price    = price,
            Brand    = brand,
            Category = category,
            Images   = images,
            ViewOnStoreUrl = url,
            Note = "Poori tafseel aur reviews Daraz par dekhein"
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Daraz detail mein masla: {ex.Message}");
    }
}).RequireRateLimiting("search");


// ── DB CONNECTION TEST ───────────────────────────────────────────────────
app.MapGet("/api/db-test", async (AppDbContext db) =>
{
    try
    {
        return Results.Ok(new
        {
            Message  = "Database connection kaam kar raha hai!",
            Stores   = await db.Stores.CountAsync(),
            Listings = await db.StoreListings.CountAsync()
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database mein masla: {ex.Message}");
    }
});

// ── RECATEGORIZE — sab listings ko title se dobara classify karo ─────────
// Pehle dryRun=true se preview lein (kuch bhi save nahi hoga), phir dryRun=false se apply karein.
app.MapPost("/api/recategorize", async (HttpContext ctx, IConfiguration config, bool? dryRun, AppDbContext db) =>
{
    if (!IsAdminRequest(ctx, config))
        return Results.Json(new { error = "Unauthorized" }, statusCode: 401);

    bool isDry = dryRun ?? true;

    var listings = await db.StoreListings
        .Select(l => new { l.Id, l.RawTitle, l.Category })
        .ToListAsync();

    var changes = new List<object>();
    var newCounts = new Dictionary<string, int>();
    var unmatchedCount = 0;

    foreach (var l in listings)
    {
        var newCat = ClassifyCategory(l.RawTitle);
        if (string.IsNullOrEmpty(newCat))
        {
            unmatchedCount++;
            continue; // koi keyword match nahi hui — purani category chhoro
        }

        if (!newCounts.ContainsKey(newCat)) newCounts[newCat] = 0;
        newCounts[newCat]++;

        if (newCat != l.Category)
        {
            changes.Add(new { l.Id, Title = l.RawTitle, OldCategory = l.Category, NewCategory = newCat });

            if (!isDry)
            {
                var entity = await db.StoreListings.FirstAsync(x => x.Id == l.Id);
                entity.Category = newCat;
            }
        }
    }

    if (!isDry)
        await db.SaveChangesAsync();

    return Results.Ok(new
    {
        DryRun = isDry,
        TotalListings = listings.Count,
        UnmatchedKeptAsIs = unmatchedCount,
        ChangedCount = changes.Count,
        NewCategoryCounts = newCounts,
        SampleChanges = changes.Take(30) // pehli 30 misalein dekhne ke liye
    });
}).RequireRateLimiting("heavy");

app.Run();


// ══════════════════════════════════════════════════════════════════════════
//  HELPER METHODS (from PriceCompare.Api)
// ══════════════════════════════════════════════════════════════════════════

static string CleanText(string raw)
{
    var noTags = Regex.Replace(raw, @"<[^>]+>", "");
    var decoded = System.Net.WebUtility.HtmlDecode(noTags);
    return Regex.Replace(decoded, @"\s+", " ").Trim();
}

static string NormalizeCategory(string? c) => (c ?? "").Trim().ToLower();

// Admin API key check — sirf secret key wale sync/admin chala sakein
static bool IsAdminRequest(HttpContext ctx, IConfiguration config)
{
    var expected = config["AdminApiKey"];
    if (string.IsNullOrWhiteSpace(expected)) return false;

    var provided = ctx.Request.Headers["X-Admin-Key"].ToString();
    return !string.IsNullOrEmpty(provided) && provided == expected;
}

// ── CATEGORY CLASSIFIER — title ke keywords se sahi category tay karta hai ──
static string ClassifyCategory(string? rawTitle)
{
    var t = " " + (rawTitle ?? "").ToLower() + " ";

    // LAPTOPS — sab se pehle (SSD/RAM ki wajah se accessories na banein)
    if (t.Contains("laptop") || t.Contains("notebook") || t.Contains("macbook") ||
        t.Contains("chromebook") || t.Contains("thinkpad") || t.Contains("ideapad") ||
        t.Contains("xps ") || t.Contains("alienware") || t.Contains("inspiron") ||
        t.Contains("latitude") || t.Contains("pavilion") || t.Contains("elitebook") ||
        t.Contains("probook") || t.Contains("vivobook") || t.Contains("zenbook") ||
        t.Contains("victus") || t.Contains("predator") || t.Contains("rog ") ||
        t.Contains("mac studio") || t.Contains("mac mini") || t.Contains("imac") ||
        t.Contains("pos system") || t.Contains("vision pro"))
        return "laptops_computers";

    // PHONES — accessories se pehle
    if (t.Contains("iphone") || t.Contains("smartphone") || t.Contains("dual sim") ||
        t.Contains("pta approved") || t.Contains("galaxy s2") || t.Contains("nothing phone") ||
        t.Contains("redmi ") || t.Contains("poco ") || t.Contains("infinix ") ||
        t.Contains("vivo y") || t.Contains("oppo ") || t.Contains("realme "))
        return "mobiles_tablets";

    // CAMERAS — accessories se pehle
    if (t.Contains("mirrorless") || t.Contains("dslr") || t.Contains("digital camera") ||
        t.Contains("camera lens") || t.Contains("zoom lens"))
        return "cameras";

    // QADAM 0A: PAKKI ACCESSORIES (hamesha accessory — device se koi farq nahi)
    if (t.Contains("protector") || t.Contains("tempered") || t.Contains("screen guard") ||
        t.Contains("case for") || t.Contains("cover for") || t.Contains("back cover") ||
        t.Contains("pouch") || t.Contains("strap for") || t.Contains("wristband") ||
        t.Contains("mouse pad") || t.Contains("mousepad") || t.Contains("bracket") ||
        t.Contains("mount for") || t.Contains("holder for"))
        return "accessories";

    // QADAM 0B: AUDIO (device check se pehle)
    string[] audioKw = {
        "headphone", "earphone", "earbud", "airpods", "airpod", "bluetooth speaker",
        "speaker", "soundbar", "sound bar", "woofer", "amplifier", "microphone",
        "handsfree", "tws", "buds ", "jabra", "headset", "loudspeaker"
    };
    if (audioKw.Any(k => t.Contains(k))) return "audio";

    // QADAM 0C: TABLETS/LAPTOPS (charger check se PEHLE!)
    if (t.Contains("tablet") || t.Contains(" tab ") || t.Contains("ipad") ||
        t.Contains("galaxy tab") || t.Contains("laptop") || t.Contains("notebook") ||
        t.Contains("macbook"))
    {
        if (t.Contains("laptop") || t.Contains("notebook") || t.Contains("macbook"))
            return "laptops_computers";
        return "mobiles_tablets";
    }

    // QADAM 0D: CHARGER/CABLE (ab safe hai — tablets/laptops nikal chuke)
    if (t.Contains("charger") || t.Contains("power adapter") || t.Contains("charging cable") ||
        t.Contains("data cable") || t.Contains("usb-c to") || t.Contains("type-c to"))
        return "accessories";

    // ── Gaming (TV se pehle) ──
    string[] gamingKw = {
        "playstation", " ps5 ", "ps5 ", "ps4", "ps3", "xbox", "nintendo switch", "nintendo",
        "gamepad", "game pad", "joystick", "gaming console", "game console", "game box",
        "game stick", "retro video games", "handheld game", "steering wheel controller",
        "vr headset", "dualsense", "dualshock", "gaming controller", "wireless controller",
        "game controller"
    };
    if (gamingKw.Any(k => t.Contains(k))) return "gaming";

    // ── Mobiles & Tablets ──
    string[] mobileKw = {
        "smartphone", "mobile phone", "iphone", "galaxy s", "galaxy a", "galaxy note",
        "galaxy z fold", "galaxy z flip", "dual sim", "pta approved",
        "android phone", "redmi", "poco",
        "oppo reno", "oppo a", "vivo v", "vivo y", "infinix ", "tecno ",
        "realme ", "nokia ", "itel ", "oneplus ", "honor x", "pixel "
    };
    if (mobileKw.Any(k => t.Contains(k))) return "mobiles_tablets";

    // ── Laptops & Computers ──
    string[] laptopKw = {
        "desktop pc", "gaming pc",
        "core i3", "core i5", "core i7", "core i9", "core ultra", "ryzen",
        "all-in-one pc", "all in one pc", "cpu tower", "computer set", "workstation",
        "ultrabook", "monitor", "thinkpad", "ideapad", "vivobook", "zenbook",
        "inspiron", "latitude", "pavilion", "elitebook", "probook", "victus",
        "predator", "legion", "omnibook", "galaxy book", "mac mini", "imac"
    };
    if (laptopKw.Any(k => t.Contains(k))) return "laptops_computers";

    // ── Wearables (PEHLE check — "strap" se pehle) ──
    string[] wearableKw = {
        "smartwatch", "smart watch", "fitness band", "fitness tracker", "smart band",
        "wristband tracker", "apple watch", "galaxy watch", "pixel watch",
        "mi band", "watch series", "watch ultra"
    };
    if (wearableKw.Any(k => t.Contains(k))) return "wearables";

    // ── Cameras ──
    string[] cameraKw = {
        "dslr", "mirrorless camera", "gopro", "action camera", "camcorder",
        "digital camera", "instax", "polaroid camera", "cctv camera",
        "drone", "gimbal", "stabilizer"
    };
    if (cameraKw.Any(k => t.Contains(k))) return "cameras";
    if (t.Contains("camera lens") && !t.Contains("protector") && !t.Contains("cover") && !t.Contains("guard"))
        return "cameras";

    // ── TV & Entertainment ──
    string[] tvKw = {
        "led tv", "smart tv", "television", " tv ", "oled tv", "qled tv",
        "home theater", "projector", "google tv", "uhd tv", "full hd tv",
        "android tv", "tv box", "android box", "apple tv"
    };
    if (tvKw.Any(k => t.Contains(k)) || t.TrimEnd().EndsWith(" tv")) return "tv_entertainment";

    // ── Kitchen appliances ──
    string[] kitchenKw = {
        "microwave", "blender", "toaster", "air fryer", "kettle", "juicer",
        "food processor", "sandwich maker", "grill", "hot plate", "rice cooker",
        "coffee maker", "cooking range", "gas stove", "oven", "burner",
        "egg boiler", "chopper", "grinder", "hand mixer", "pressure cooker"
    };
    if (kitchenKw.Any(k => t.Contains(k))) return "kitchen_appliances";

    // ── Home appliances ──
    string[] homeKw = {
        "refrigerator", "fridge", "washing machine", "air conditioner", " ac ",
        "split ac", "inverter ac", "dc inverter",
        "vacuum cleaner", "iron ", "water dispenser", "dishwasher", "deep freezer",
        "room cooler", "air cooler", "air purifier", "dryer",
        "ceiling fan", "pedestal fan", "therapy lamp", "infrared lamp"
    };
    if (homeKw.Any(k => t.Contains(k))) return "home_appliances";

    // ═══ STEP 1: BAAKI ACCESSORIES BAAD MEIN ═══
    string[] accessoryKw = {
        "ram ", " ram,", "ddr3", "ddr4", "ddr5", "ssd", "hdd", "hard drive", "hard disk",
        "power bank", "powerbank", "charger", "charging cable", "usb cable", "type-c cable",
        "adapter", "adaptor", "screen protector", "tempered glass", "phone case", "back cover",
        "laptop bag", "laptop sleeve", "mouse", "keyboard", "mousepad", "mouse pad",
        "memory card", "sd card", "flash drive", "pen drive", "usb hub", "docking station",
        "tripod", "selfie stick", "stylus", "ring light", "cooling pad", "laptop stand",
        "car charger", "wall charger", "earphone case", "cable organizer", "extension cord",
        "surge protector", "webcam cover", "camera lens protector",
        "replacement strap", "strap for", "band for", "watch strap", "watch band",
        "case for", "cover for", "pouch", "sleeve for", "mount", "holder",
        "toner", "cartridge", "dongle", "otg"
    };
    if (accessoryKw.Any(k => t.Contains(k))) return "accessories";

    // Kuch match na ho to purani category rehne dein (caller handle karega)
    return "";
}

static Offer ToOffer(long id, string title, string store, decimal price, string? url, string? imageUrl, bool hasComparison = false)
{
    string handle = "";
    if (!string.IsNullOrEmpty(url))
    {
        int idx = url.LastIndexOf('/');
        handle = idx >= 0 ? url[(idx + 1)..] : url;
    }
    return new Offer(id, title, store, price.ToString(), "PKR", handle, url ?? "", imageUrl, hasComparison);
}

record Offer(
    long Id,
    string Title,
    string Store,
    string Price,
    string Currency,
    string Handle,
    string Url,
    string? ImageUrl,
    bool HasComparison = false
);

record GroupRow(long group_id, string raw_title, string store, decimal price,
                string? image_url, string? product_url, string? category);

record CompareRow(string store, decimal price, string? product_url, string? raw_title);

record BrowseRow(long id, string raw_title, string store, decimal price,
                 string? product_url, string? image_url, bool has_comparison);

record HistoryRow(decimal price, DateTime recorded_at);

record ScraperRunRow(long id, string store_name, string status, int items_scraped,
                     string? error_message, DateTime started_at, DateTime? finished_at);
