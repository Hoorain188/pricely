using System.Text.Json;
using Pricely.Api.Services;

namespace Pricely.Api.Middleware;

/// <summary>
/// Turns AuthException into a clean {code, message} JSON body the app can
/// switch on, and makes sure nothing else ever leaks a stack trace to callers.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AuthException ex)
        {
            _logger.LogInformation("Auth rejected: {Code} — {Message}", ex.Code, ex.Message);
            await WriteAsync(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Path}", context.Request.Path);
            await WriteAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "server_error",
                "Something went wrong on our end. Please try again.");
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string code, string message)
    {
        if (context.Response.HasStarted)
            return;

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsync(JsonSerializer.Serialize(new { code, message },
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}
