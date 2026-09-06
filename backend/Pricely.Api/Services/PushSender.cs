using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

/// <summary>
/// Sends notifications to phones, through Expo's push service.
///
/// This goes out over HTTPS, which is why notifications work where the
/// emailed verification codes do not: hosts block outbound SMTP, nothing
/// blocks HTTPS.
///
/// Every failure is logged and swallowed. A notification is a courtesy — a
/// price alert that cannot be delivered must not take down the scrape that
/// noticed the price, or roll back the row saying the alert fired.
/// </summary>
public interface IPushSender
{
    /// <summary>Sends to every device the user has registered. Does nothing if they have none.</summary>
    Task SendToUserAsync(long userId, string title, string body, object? data = null, CancellationToken ct = default);

    /// <summary>Sends to every device belonging to any of these users, in one request.</summary>
    Task SendToUsersAsync(IEnumerable<long> userIds, string title, string body, object? data = null, CancellationToken ct = default);
}

public class PushSender : IPushSender
{
    private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";

    /// <summary>Expo's documented ceiling for one request.</summary>
    private const int MaxPerRequest = 100;

    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<PushSender> _logger;

    public PushSender(AppDbContext db, IHttpClientFactory http, ILogger<PushSender> logger)
    {
        _db = db;
        _http = http;
        _logger = logger;
    }

    public Task SendToUserAsync(long userId, string title, string body, object? data = null, CancellationToken ct = default)
        => SendToUsersAsync(new[] { userId }, title, body, data, ct);

    public async Task SendToUsersAsync(
        IEnumerable<long> userIds, string title, string body, object? data = null, CancellationToken ct = default)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0) return;

        var tokens = await _db.PushTokens
            .Where(t => ids.Contains(t.UserId))
            .Select(t => t.Token)
            .ToListAsync(ct);

        if (tokens.Count == 0)
        {
            // Not a failure: nobody involved has opened the app on a device
            // that agreed to notifications.
            _logger.LogInformation("No push tokens for {Count} user(s); nothing sent", ids.Count);
            return;
        }

        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);

        foreach (var batch in tokens.Chunk(MaxPerRequest))
        {
            var messages = batch.Select(t => new ExpoMessage
            {
                To = t,
                Title = title,
                Body = body,
                Data = data,
                Sound = "default"
            }).ToList();

            try
            {
                var response = await client.PostAsJsonAsync(ExpoPushUrl, messages, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Expo rejected a push batch: {Status}", response.StatusCode);
                    continue;
                }

                var result = await response.Content.ReadFromJsonAsync<ExpoResponse>(cancellationToken: ct);
                await HandleReceiptsAsync(batch, result, ct);
            }
            catch (Exception ex)
            {
                // Swallowed on purpose — see the note on the interface.
                _logger.LogError(ex, "Could not send a push batch of {Count}", batch.Length);
            }
        }
    }

    /// <summary>
    /// Expo answers per message. "DeviceNotRegistered" means the app is gone
    /// from that phone and the token will never work again, so the row is
    /// removed instead of being retried forever.
    /// </summary>
    private async Task HandleReceiptsAsync(string[] batch, ExpoResponse? result, CancellationToken ct)
    {
        if (result?.Data is null) return;

        var dead = new List<string>();

        for (var i = 0; i < result.Data.Count && i < batch.Length; i++)
        {
            var ticket = result.Data[i];
            if (ticket.Status == "ok") continue;

            if (ticket.Details?.Error == "DeviceNotRegistered")
                dead.Add(batch[i]);
            else
                _logger.LogWarning("Push not delivered: {Message}", ticket.Message);
        }

        if (dead.Count > 0)
        {
            await _db.PushTokens.Where(t => dead.Contains(t.Token)).ExecuteDeleteAsync(ct);
            _logger.LogInformation("Removed {Count} token(s) Expo reported as dead", dead.Count);
        }

        var live = batch.Except(dead).ToList();
        if (live.Count > 0)
        {
            await _db.PushTokens
                .Where(t => live.Contains(t.Token))
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.LastUsedAt, DateTimeOffset.UtcNow), ct);
        }
    }

    // ── Expo's wire format ───────────────────────────────────────────────

    private class ExpoMessage
    {
        [JsonPropertyName("to")]    public string To { get; set; } = "";
        [JsonPropertyName("title")] public string Title { get; set; } = "";
        [JsonPropertyName("body")]  public string Body { get; set; } = "";
        [JsonPropertyName("sound")] public string? Sound { get; set; }

        /// <summary>Travels with the notification; the app reads it to know which screen to open.</summary>
        [JsonPropertyName("data")]  public object? Data { get; set; }
    }

    private class ExpoResponse
    {
        [JsonPropertyName("data")] public List<ExpoTicket>? Data { get; set; }
    }

    private class ExpoTicket
    {
        [JsonPropertyName("status")]  public string? Status { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
        [JsonPropertyName("details")] public ExpoDetails? Details { get; set; }
    }

    private class ExpoDetails
    {
        [JsonPropertyName("error")] public string? Error { get; set; }
    }
}
