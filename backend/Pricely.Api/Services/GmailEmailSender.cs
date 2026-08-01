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

    private async Task SendAsync(
        string toEmail,
        string subject,
        string plainBody,
        string code,
        string heading,
        string blurb,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.FromAddress) || string.IsNullOrWhiteSpace(_options.SmtpPassword))
        {
            throw new InvalidOperationException(
                "Email is not configured. Set Email:FromAddress and Email:SmtpPassword " +
                "(see backend/README.md for the user-secrets commands).");
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;

        message.Body = new BodyBuilder
        {
            TextBody = plainBody,
            HtmlBody = BuildHtml(heading, blurb, code)
        }.ToMessageBody();

        using var client = new SmtpClient();
        try
        {
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

    private static string BuildHtml(string heading, string blurb, string code) => $"""
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#16211A">
          <h1 style="font-size:20px;margin:0 0 8px">{heading}</h1>
          <p style="font-size:14px;line-height:1.6;color:#5B6660;margin:0 0 24px">{blurb}</p>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#0E6B4F;background:#EAF4EF;border-radius:12px;padding:18px;text-align:center">{code}</div>
          <p style="font-size:12px;color:#8B958E;margin:24px 0 0">This code expires in 15 minutes.</p>
        </div>
        """;
}
