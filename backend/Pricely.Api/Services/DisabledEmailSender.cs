namespace Pricely.Api.Services;

/// <summary>
/// The registered sender while the app has no mail provider.
///
/// Email was taken out deliberately: SMTP is blocked outbound on the host,
/// and the address it was going out from was a personal Gmail. Nothing here
/// sends anything, and nothing here ever will — CanSend is false, and every
/// caller checks it and takes its own no-email path rather than relying on
/// these methods.
///
/// The interface stays, so adding a provider later is one new class and one
/// line in Program.cs. Nothing that calls IEmailSender has to change.
/// </summary>
public class DisabledEmailSender : IEmailSender
{
    private readonly ILogger<DisabledEmailSender> _logger;

    public DisabledEmailSender(ILogger<DisabledEmailSender> logger) => _logger = logger;

    public bool CanSend => false;

    public Task SendVerificationCodeAsync(string toEmail, string code, CancellationToken ct = default) => Skip("verification code", toEmail);
    public Task SendPasswordResetCodeAsync(string toEmail, string code, CancellationToken ct = default) => Skip("password reset code", toEmail);
    public Task SendTeamInviteAsync(string toEmail, string inviteToken, string role, CancellationToken ct = default) => Skip("team invite", toEmail);

    public Task SendPriceAlertAsync(
        string toEmail, string productTitle, string storeName,
        decimal currentPrice, decimal targetPrice, string? productUrl,
        CancellationToken ct = default) => Skip("price alert", toEmail);

    public Task SendNoticeAsync(string toEmail, string subject, string heading, string body, CancellationToken ct = default)
        => Skip(subject, toEmail);

    /// <summary>
    /// Reaching this means a caller skipped its CanSend check. Logged as a
    /// warning so that shows up, but not thrown: the failure mode of an
    /// unchecked call should be one missing email, not a broken request.
    /// Deliberately does not log the code or token — only what kind it was.
    /// </summary>
    private Task Skip(string kind, string toEmail)
    {
        _logger.LogWarning("Email is disabled; did not send {Kind} to {Email}", kind, toEmail);
        return Task.CompletedTask;
    }
}
