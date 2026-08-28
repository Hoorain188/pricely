using System.Text;
using Hangfire.Dashboard;

namespace Pricely.Api.Authorization;

public class HangfireAuthFilter : IDashboardAuthorizationFilter
{
    private readonly string _username;
    private readonly string _password;

    public HangfireAuthFilter(string username = "admin", string password = "Pricely@2026")
    {
        _username = username;
        _password = password;
    }

    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        string? authHeader = httpContext.Request.Headers["Authorization"];

        if (authHeader != null && authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var encoded = authHeader.Substring("Basic ".Length).Trim();
                var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
                var parts = decoded.Split(':', 2);

                if (parts.Length == 2 && parts[0] == _username && parts[1] == _password)
                    return true;
            }
            catch
            {
                // Invalid base64 header format
            }
        }

        httpContext.Response.StatusCode = 401;
        httpContext.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Hangfire Dashboard\"";
        return false;
    }
}
