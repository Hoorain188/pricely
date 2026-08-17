using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Pricely.Api.Services;

/// <summary>
/// Who is making this request, taken from the verified JWT.
/// </summary>
public interface ICurrentUser
{
    long Id { get; }
}

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;
    public CurrentUser(IHttpContextAccessor http) => _http = http;

    /// <summary>
    /// Reads the "sub" claim, which only exists on a token this server signed.
    ///
    /// This previously read an X-Actor-Id request header, as a stand-in while
    /// auth was still being built. That let any caller name themselves as any
    /// user id, so every activity_log row was only as trustworthy as the
    /// client that sent it. The claim cannot be forged without the signing key.
    ///
    /// Returns 0 for an unauthenticated request. Endpoints that need an actor
    /// are behind [Authorize], so a 0 here means something reached this code
    /// that should not have.
    /// </summary>
    public long Id
    {
        get
        {
            var sub = _http.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return long.TryParse(sub, out var id) ? id : 0;
        }
    }
}
