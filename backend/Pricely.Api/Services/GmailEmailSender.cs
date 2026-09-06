using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Pricely.Api.Services;

public class GmailEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<GmailEmailSender> _logger;

    public GmailEmailSender(IOptions<EmailOptions> options, ILogger<GmailEmailSender> logger)
    {
        _options = options.Value;
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
            ct);

    public Task SendPasswordResetCodeAsync(string toEmail, string code, CancellationToken ct = default) =>
        SendAsync(
            toEmail,
            "Your Pricely password reset code",
            $"Your Pricely password reset code is {code}. It expires in 15 minutes. If you didn't ask for this, ignore this email.",
            code,
            "Reset your password",
            "Enter this code in the app to choose a new password. If you didn't request this, you can ignore this email.",
            ct);

    public Task SendTeamInviteAsync(string toEmail, string inviteToken, string role, CancellationToken ct = default) =>
        SendAsync(
            toEmail,
            "You've been invited to the Pricely team",
            $"You've been invited to join the Pricely back office as {role}. Your invite code is {inviteToken}. It expires in 7 days.",
            inviteToken,
            "Join the Pricely team",
            $"You've been invited as <strong>{role}</strong>. Enter this code in the app to set up your account. It expires in 7 days.",
            ct);

    /// <summary>
    /// Reuses the code layout, with the new price where the code normally
    /// goes — it is the one number the reader is looking for, and it belongs
    /// in the same prominent slot.
    /// </summary>
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
            ct,
            "You're getting this because you set a price alert. Turn these off in Settings.");
    }

    private async Task SendAsync(
        string toEmail,
        string subject,
        string plainBody,
        string code,
        string heading,
        string blurb,
        CancellationToken ct,
        string? footer = null)
    {
        if (string.IsNullOrWhiteSpace(_options.FromAddress) || string.IsNullOrWhiteSpace(_options.SmtpPassword))
        {
            _logger.LogWarning("==================================================");
            _logger.LogWarning("DEV MODE: Email not configured. VERIFICATION CODE FOR {Email}: [{Code}]", toEmail, code);
            _logger.LogWarning("==================================================");
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            TextBody = plainBody,
            HtmlBody = BuildHtml(heading, blurb, code, footer)
        }.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
            // Skips only the "has this certificate been revoked?" lookup, which
            // cannot complete on some machines (notably macOS) and fails the
            // whole handshake with "An incomplete certificate revocation check
            // occurred" even though the chain is valid.
            //
            // The certificate is still fully validated — issuer, trust root,
            // hostname and expiry. This is deliberately NOT a callback that
            // accepts any certificate: that would disable those checks too and
            // leave the SMTP session open to interception.
            client.CheckCertificateRevocation = false;

            // Hosts commonly block outbound SMTP, and a blocked port does not
            // refuse the connection — it drops the packets, so ConnectAsync sits
            // there. On Render that took just over two minutes before failing,
            // and signup waits for this, so the caller saw a request that hung
            // and then returned 500. Fifteen seconds is far longer than a
            // working handshake needs and turns "blocked" into a fast, legible
            // failure instead of a timeout somewhere further up.
            client.Timeout = 15_000;

            // Gmail on 587 uses STARTTLS (upgrade a plain connection to TLS),
            // not implicit SSL — SslOnConnect here would hang.
            await client.ConnectAsync(_options.SmtpHost, _options.SmtpPort, SecureSocketOptions.StartTls, ct);
            await client.AuthenticateAsync(_options.FromAddress, _options.SmtpPassword, ct);
            await client.SendAsync(message, ct);
            _logger.LogInformation("Sent {Subject} to {Email}", subject, toEmail);
        }
        catch (Exception ex)
        {
            // Deliberately not swallowed: a signup that silently fails to send
            // its code leaves the user stuck with no way to know why.
            _logger.LogError(ex, "Failed to send {Subject} to {Email}", subject, toEmail);
            throw;
        }
        finally
        {
            if (client.IsConnected)
                await client.DisconnectAsync(true, ct);
        }
    }

    private static string BuildHtml(string heading, string blurb, string code, string? footer = null)
    {
        // A 6-digit code reads well big and widely spaced; a 64-character invite
        // token does not — it needs to wrap instead of overflowing the email.
        var isShortCode = code.Length <= 8;
        var codeStyle = isShortCode
            ? "font-size:32px;font-weight:700;letter-spacing:8px;text-align:center"
            : "font-size:14px;font-weight:600;text-align:center;word-break:break-all;line-height:1.5";

        footer ??= isShortCode
            ? "This code expires in 15 minutes."
            : "This invite expires in 7 days.";

        return $"""
            <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#16211A">
              <h1 style="font-size:20px;margin:0 0 8px">{heading}</h1>
              <p style="font-size:14px;line-height:1.6;color:#5B6660;margin:0 0 24px">{blurb}</p>
              <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#0E6B4F;background:#EAF4EF;border-radius:12px;padding:18px;{codeStyle}">{code}</div>
              <p style="font-size:12px;color:#8B958E;margin:24px 0 0">{footer}</p>
            </div>
            """;
    }
}
