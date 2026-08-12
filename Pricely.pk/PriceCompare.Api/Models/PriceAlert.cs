using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class PriceAlert
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public long ProductId { get; set; }

    public decimal TargetPrice { get; set; }

    public bool IsTriggered { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? TriggeredAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
