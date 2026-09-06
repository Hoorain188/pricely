namespace Pricely.Api.Services;

public class EmailOptions
{
    public const string SectionName = "Email";

    public string SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;

    /// <summary>The Gmail address the codes are sent from.</summary>
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "Pricely";

    /// <summary>
    /// Gmail App Password (16 chars), NOT the account's normal password.
    /// Requires 2-Step Verification on the Google account. Never commit this —
    /// it belongs in user-secrets locally and an env var in deployment.
    /// </summary>
    public string SmtpPassword { get; set; } = "";

    /// <summary>
    /// Resend's API key. When set, mail goes over HTTPS through Resend and
    /// SMTP is not used at all — which is the point: hosts block outbound
    /// SMTP, and nothing blocks HTTPS. Gmail's settings above are then
    /// ignored except FromAddress and FromName.
    ///
    /// Set it with:
    ///   dotnet user-secrets set "Email:ResendApiKey" "re_..."
    /// or as the Email__ResendApiKey environment variable when deployed.
    /// </summary>
    public string ResendApiKey { get; set; } = "";
}
