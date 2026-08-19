namespace Pricely.Api.Authorization;

public static class RateLimitPolicies
{
    /// <summary>Login and code entry — the endpoints worth guessing against.</summary>
    public const string Sensitive = nameof(Sensitive);

    /// <summary>Anything that triggers an outbound email, to prevent inbox flooding.</summary>
    public const string EmailSending = nameof(EmailSending);
}
