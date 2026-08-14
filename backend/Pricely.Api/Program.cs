using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
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

var builder = WebApplication.CreateBuilder(args);

// Keep JWT claims exactly as they were written ("sub" stays "sub" rather than
// being rewritten to a long schema URL), so reading them back is predictable.
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// ── Database ─────────────────────────────────────────────────────────────
// One DbContext for the whole API. Two contexts over the same tables would
// mean EF holding two opinions about the same rows, and whichever a
// controller happened to inject would win.
//
// "Postgres" is read as a fallback purely so an existing local user-secrets
// entry from the auth branch keeps working; "Default" is the name to use.
var connString = builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:Default is missing. Set it with dotnet user-secrets — see backend/README.md.");

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

// Auth side
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TeamService>();

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

var app = builder.Build();

// ── Pipeline ─────────────────────────────────────────────────────────────
// Order matters. The exception handler goes first so it wraps everything
// below it, and authentication must run before authorisation — otherwise
// policies evaluate against an anonymous user and every admin route 401s.

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (!emailConfigured)
{
    app.Logger.LogWarning(
        "Gmail is not configured — verification codes will be printed to this console " +
        "instead of emailed. Set Email:FromAddress and Email:SmtpPassword to send real mail.");
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("app");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
