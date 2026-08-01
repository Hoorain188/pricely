using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Npgsql;
using Pricely.Api.Data;
using Pricely.Api.Middleware;
using Pricely.Api.Models;
using Pricely.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Keep JWT claims exactly as they were written ("sub" stays "sub" rather than
// being rewritten to a long schema URL), so reading them back is predictable.
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// ── Database ─────────────────────────────────────────────────────────────

var connectionString = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:Postgres is not set. Run the user-secrets commands in backend/README.md.");
}

// Npgsql has to be told about the native Postgres enum types before it can
// read or write those columns at all.
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<UserRole>("user_role");
dataSourceBuilder.MapEnum<VerificationPurpose>("verification_purpose");
dataSourceBuilder.MapEnum<TeamRequestStatus>("team_request_status");
dataSourceBuilder.MapEnum<TeamRequestType>("team_request_type");
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<PricelyDbContext>(options =>
    options.UseNpgsql(dataSource).UseSnakeCaseNamingConvention());

// ── Options ──────────────────────────────────────────────────────────────

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));

// ── Auth ─────────────────────────────────────────────────────────────────

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

builder.Services.AddAuthorization(options =>
{
    // Admin, Support and Read-only can all reach the back office; what each
    // may *do* inside it gets enforced per-endpoint.
    options.AddPolicy("BackOffice", policy =>
        policy.RequireRole(nameof(UserRole.Admin), nameof(UserRole.Support), nameof(UserRole.ReadOnly)));

    options.AddPolicy("AdminOnly", policy => policy.RequireRole(nameof(UserRole.Admin)));
});

// ── Services ─────────────────────────────────────────────────────────────

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<AuthService>();

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
        // read {"role": "Admin"} instead of hard-coding indexes.
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Pricely API", Version = "v1" });

    // Lets you paste a token into Swagger UI and call the [Authorize] endpoints.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the accessToken returned by /api/auth/login."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
    options.AddPolicy("App", policy => policy
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

// ── Pipeline ─────────────────────────────────────────────────────────────

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (!emailConfigured)
{
    app.Logger.LogWarning(
        "Gmail is not configured — verification codes will be printed to this console " +
        "instead of emailed. Set Email:FromAddress and Email:SmtpPassword to send real mail.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("App");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
