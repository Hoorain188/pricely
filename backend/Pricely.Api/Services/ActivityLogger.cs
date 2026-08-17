using System.Text.Json;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

/// <summary>
/// Writes to activity_log. The human sentence is rendered on the server
/// (see ActivityController) so new action types never require an app release.
/// </summary>
public interface IActivityLogger
{
    void Record(string action, string? targetType = null, long? targetId = null, object? details = null);
}

public class ActivityLogger : IActivityLogger
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _me;

    public ActivityLogger(AppDbContext db, ICurrentUser me)
    {
        _db = db;
        _me = me;
    }

    public void Record(string action, string? targetType = null, long? targetId = null, object? details = null)
    {
        // Caller is responsible for SaveChangesAsync, so the log entry commits
        // in the same transaction as the thing it describes.
        _db.ActivityLog.Add(new ActivityLogEntry
        {
            ActorId    = _me.Id,
            Action     = action,
            TargetType = targetType,
            TargetId   = targetId,
            Details    = details is null ? null : JsonSerializer.Serialize(details),
            CreatedAt  = DateTimeOffset.UtcNow
        });
    }
}