using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Pricely.Api.Services;

/// <summary>
/// Sends mail through Resend, over HTTPS.
///
/// This exists because SMTP does not work where the app is deployed. Hosts
/// block outbound port 587 to stop their address ranges being used for spam,
/// and a blocked port does not refuse the connection — it drops the packets,
/// so the send hangs and then fails. Signup waited on that and returned 500
/// after two minutes.
///
/// HTTPS is not blocked anywhere, so this works on Render, Railway, Fly, a
/// laptop, anywhere. Selected in Program.cs whenever Email:ResendApiKey is
/// set; Gmail stays the fallback for local work.
/// </summary>
public class ResendEmailSender : IEmailSender
{
    private const string ResendUrl = "https://api.resend.com/emails";

    private readonly EmailOptions _options;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        IOptions<EmailOptions> options, IHttpClientFactory http, ILogger<ResendEmailSender> logger)
    {
        _options = options.Value;
        _http = http;
        _logger = logger;
    }

    public Task SendVerificationCodeAsync(string toEmail, string code, CancellationToken ct = default) =>
        SendAsync(
            toEmail,
            "Your Pricely verification code",
            $"Welcome to Pricely. Your verification code is {code}. It expires in 15 minutes.",
            code,
            "Confirm your email",
            "Enter this code in the app to finish creating your account.",
            "This code expires in 15 minutes.",
            ct);

    public Task SendPasswordResetCodeAsync(string toEmail, string code, CancellationToken ct = default) =>
        SendAsync(
            toEmail,
            "Your Pricely password reset code",
            $"Your Pricely password reset code is {code}. It expires in 15 minutes. If you didn't ask for this, ignore this email.",
            code,
            "Reset your password",
            "Enter this code in the app to choose a new password. If you didn't request this, you can ignore this email.",
            "This code expires in 15 minutes.",
            ct);

    public Task SendTeamInviteAsync(string toEmail, string inviteToken, string role, CancellationToken ct = default) =>
        SendAsync(
            toEmail,
            "You've been invited to the Pricely team",
            $"You've been invited to join the Pricely back office as {role}. Your invite code is {inviteToken}. It expires in 7 days.",
            inviteToken,
            "Join the Pricely team",
            $"You've been invited as <strong>{role}</strong>. Enter this code in the app to set up your account.",
            "This invite expires in 7 days.",
            ct);

    public Task SendPriceAlertAsync(
        string toEmail, string productTitle, string storeName,
        decimal currentPrice, decimal targetPrice, string? productUrl,
        CancellationToken ct = default)
    {
        var price = $"Rs {currentPrice:N0}";
        var target = $"Rs {targetPrice:N0}";
        var link = string.IsNullOrWhiteSpace(productUrl)
            ? ""
            : $"<p style=\"margin:18px 0 0\"><a href=\"{productUrl}\">View it at {storeName}</a></p>";

        return SendAsync(
            toEmail,
            $"Price drop: {productTitle}",
            $"{productTitle} is now {price} at {storeName}. You asked to be told when it reached {target}."
                + (string.IsNullOrWhiteSpace(productUrl) ? "" : $" {productUrl}"),
            price,
            "The price dropped",
            $"<strong>{productTitle}</strong> is now {price} at {storeName}. "
                + $"You asked to be told when it reached {target}.{link}",
            "You're getting this because you set a price alert. Turn these off in Settings.",
            ct);
    }

    public Task SendNoticeAsync(
        string toEmail, string subject, string heading, string body, CancellationToken ct = default)
        => SendAsync(toEmail, subject, body, "", heading, body, "Pricely back office", ct);

    private async Task SendAsync(
        string toEmail, string subject, string plainBody,
        string highlight, string heading, string blurb, string footer,
        CancellationToken ct)
    {
        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _options.ResendApiKey);

        // Resend requires a verified sender. Until a domain is verified, only
        // its shared onboarding address works, so an unset FromAddress falls
        // back to that rather than failing outright.
        var from = string.IsNullOrWhiteSpace(_options.FromAddress)
            ? "Pricely <onboarding@resend.dev>"
            : $"{_options.FromName} <{_options.FromAddress}>";

        var payload = new ResendPayload
        {
            From = from,
            To = new[] { toEmail },
            Subject = subject,
            Text = plainBody,
            Html = BuildHtml(heading, blurb, highlight, footer)
        };

        var response = await client.PostAsJsonAsync(ResendUrl, payload, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);

            // Thrown, not swallowed, for the same reason the SMTP sender threw:
            // a signup whose code silently never sends leaves someone stuck
            // with no way to know why. Callers that can survive a failed send
            // — the price alert checker — catch it themselves.
            _logger.LogError("Resend rejected {Subject} to {Email}: {Status} {Body}",
                subject, toEmail, response.StatusCode, body);

            throw new InvalidOperationException(
                $"Resend refused the message ({(int)response.StatusCode}). {body}");
        }

        _logger.LogInformation("Sent {Subject} to {Email} via Resend", subject, toEmail);
    }

    private static string BuildHtml(string heading, string blurb, string highlight, string footer)
    {
        // A 6-digit code reads well big and widely spaced; a long invite token
        // or a price does not — those need to wrap rather than overflow.
        var isShort = highlight.Length <= 8;
        var style = isShort
            ? "font-size:32px;font-weight:700;letter-spacing:8px;text-align:center"
            : "font-size:20px;font-weight:700;text-align:center;word-break:break-all;line-height:1.5";

        return $"""
            <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#16211A">
              <h1 style="font-size:20px;margin:0 0 8px">{heading}</h1>
              <p style="font-size:14px;line-height:1.6;color:#5B6660;margin:0 0 24px">{blurb}</p>
              <div style="background:#F3F6F4;border-radius:12px;padding:20px;{style}">{highlight}</div>
              <p style="font-size:12px;color:#8B958E;margin:24px 0 0">{footer}</p>
            </div>
            """;
    }

    private class ResendPayload
    {
        [JsonPropertyName("from")]    public string From { get; set; } = "";
        [JsonPropertyName("to")]      public string[] To { get; set; } = [];
        [JsonPropertyName("subject")] public string Subject { get; set; } = "";
        [JsonPropertyName("html")]    public string Html { get; set; } = "";
        [JsonPropertyName("text")]    public string Text { get; set; } = "";
    }
}
