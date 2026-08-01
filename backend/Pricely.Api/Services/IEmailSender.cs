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
}
