namespace Pricely.Api.Services;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "Pricely.Api";
    public string Audience { get; set; } = "Pricely.App";

    /// <summary>
    /// The secret the server signs tokens with. Anyone holding this can mint
    /// valid admin tokens, so it never goes in appsettings.json — user-secrets
    /// locally, env var in deployment. Must be at least 32 characters.
    /// </summary>
    public string SigningKey { get; set; } = "";

    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 30;
}
