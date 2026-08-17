using System.Text.Json;
using Pricely.Api.Data;
using Pricely.Api.Models;

namespace Pricely.Api.Services;

public interface IActivityLogger
{
    /// <summary>
    /// Queues an audit row. Does NOT call SaveChanges — the caller saves it in
    /// the same transaction as the action itself, so an action can never be
    /// recorded without happening, or happen without being recorded.
    /// </summary>
    void Record(long actorId, string action, string? targetType = null, long? targetId = null, object? details = null);
}

public class ActivityLogger : IActivityLogger
{
    private readonly PricelyDbContext _db;

    public ActivityLogger(PricelyDbContext db) => _db = db;

    public void Record(long actorId, string action, string? targetType = null, long? targetId = null, object? details = null)
    {
        _db.ActivityLogs.Add(new ActivityLog
        {
            ActorId = actorId,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            Details = details is null ? null : JsonSerializer.SerializeToDocument(details)
        });
    }
}
