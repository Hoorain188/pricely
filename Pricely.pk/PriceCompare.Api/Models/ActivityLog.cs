using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class ActivityLog
{
    public long Id { get; set; }

    public long ActorId { get; set; }

    public string Action { get; set; } = null!;

    public string? TargetType { get; set; }

    public long? TargetId { get; set; }

    public string? Details { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User Actor { get; set; } = null!;
}
