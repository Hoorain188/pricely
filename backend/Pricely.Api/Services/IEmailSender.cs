namespace Pricely.Api.Services;

/// <summary>
/// The seam between auth logic and however mail actually goes out. Auth code
/// only ever talks to this interface, so swapping Gmail for SendGrid later
/// (or a no-op fake in tests) touches nothing but Program.cs registration.
/// </summary>
public interface IEmailSender
{
    Task SendVerificationCodeAsync(string toEmail, string code, CancellationToken ct = default);
    Task SendPasswordResetCodeAsync(string toEmail, string code, CancellationToken ct = default);

    /// <summary>
    /// Invites someone onto the back-office team. <paramref name="inviteToken"/>
    /// is the raw token — the only copy that exists outside the email.
    /// </summary>
    Task SendTeamInviteAsync(string toEmail, string inviteToken, string role, CancellationToken ct = default);

    /// <summary>
    /// Tells a shopper a watched price has reached their target. Sent
    /// alongside the push notification, not instead of it — a phone can be
    /// off, or have refused notifications, and this is the thing they asked
    /// to be told about.
    /// </summary>
    Task SendPriceAlertAsync(
        string toEmail, string productTitle, string storeName,
        decimal currentPrice, decimal targetPrice, string? productUrl,
        CancellationToken ct = default);
}
