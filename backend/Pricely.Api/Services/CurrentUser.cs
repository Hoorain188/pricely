namespace Pricely.Api.Services;

/// <summary>
/// Who is making this request. Until auth ships, the actor comes from an
/// X-Actor-Id header so the activity log can still record something real.
/// When the JWT lands, only the implementation below changes.
/// </summary>
public interface ICurrentUser
{
    long Id { get; }
}

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;
    public CurrentUser(IHttpContextAccessor http) => _http = http;

    public long Id
    {
        get
        {
            // TODO: replace with the "sub" claim once auth is wired up:
            //   long.Parse(_http.HttpContext!.User.FindFirstValue(JwtRegisteredClaimNames.Sub)!)
            var header = _http.HttpContext?.Request.Headers["X-Actor-Id"].FirstOrDefault();
            return long.TryParse(header, out var id) ? id : 0;
        }
    }
}