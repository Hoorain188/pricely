namespace Pricely.Api.Services;

/// <summary>
/// The seam between auth logic and however mail actually goes out. Auth code
/// only ever talks to this interface, so swapping Gmail for SendGrid later
/// (or a no-op fake in tests) touches nothing but Program.cs registration.
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// False when no mail provider is configured. Callers check this instead
    /// of sending and catching the failure, because the right response differs
    /// by flow: signup skips the code and creates the account directly, an
    /// invite hands its code back to the admin, forgot-password says it is
    /// unavailable, and alerts and summaries simply go by push alone.
    /// </summary>
    bool CanSend { get; }

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

    /// <summary>
    /// A plain notice with no code and no highlighted value — the weekly
    /// back-office summary, and anything else of that shape. Kept separate
    /// from the code emails so a summary does not have to pretend a number is
    /// a verification code to get rendered.
    /// </summary>
    Task SendNoticeAsync(
        string toEmail, string subject, string heading, string body,
        CancellationToken ct = default);
}
