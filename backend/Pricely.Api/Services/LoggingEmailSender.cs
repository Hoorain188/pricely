namespace Pricely.Api.Services;

/// <summary>
/// Development-only stand-in that writes the code to the console instead of
/// sending it. Lets the API run before Gmail credentials are set up, and lets
/// a teammate work without needing the shared mailbox password.
///
/// Program.cs only registers this when the environment is Development AND no
/// Gmail settings are present, and logs a warning when it does — so a
/// misconfigured deployment can never quietly stop sending real mail.
/// </summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger) => _logger = logger;

    public Task SendVerificationCodeAsync(string toEmail, string code, CancellationToken ct = default)
    {
        Write("SIGNUP VERIFICATION", toEmail, code);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetCodeAsync(string toEmail, string code, CancellationToken ct = default)
    {
        Write("PASSWORD RESET", toEmail, code);
        return Task.CompletedTask;
    }

    public Task SendTeamInviteAsync(string toEmail, string inviteToken, string role, CancellationToken ct = default)
    {
        _logger.LogWarning(
            "[EMAIL NOT SENT — dev fallback] TEAM INVITE ({Role}) for {Email}, token is {Token}",
            role, toEmail, inviteToken);
        return Task.CompletedTask;
    }

    public Task SendPriceAlertAsync(
        string toEmail, string productTitle, string storeName,
        decimal currentPrice, decimal targetPrice, string? productUrl,
        CancellationToken ct = default)
    {
        _logger.LogWarning(
            "[EMAIL NOT SENT — dev fallback] PRICE ALERT for {Email}: {Product} is Rs {Price} at {Store} (target Rs {Target})",
            toEmail, productTitle, currentPrice, storeName, targetPrice);
        return Task.CompletedTask;
    }

    public Task SendNoticeAsync(
        string toEmail, string subject, string heading, string body, CancellationToken ct = default)
    {
        _logger.LogWarning("[EMAIL NOT SENT — dev fallback] NOTICE to {Email}: {Subject} — {Body}",
            toEmail, subject, body);
        return Task.CompletedTask;
    }

    private void Write(string kind, string toEmail, string code) =>
        _logger.LogWarning(
            "[EMAIL NOT SENT — dev fallback] {Kind} code for {Email} is {Code}",
            kind, toEmail, code);
}
