namespace Pricely.Api.Services;

/// <summary>
/// A failure the caller is meant to see (bad code, wrong password, pending
/// approval). <see cref="Code"/> is the stable string the app switches on;
/// Message is the human text it can show directly.
/// </summary>
public class AuthException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }

    public AuthException(string code, string message, int statusCode = StatusCodes.Status400BadRequest)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}
