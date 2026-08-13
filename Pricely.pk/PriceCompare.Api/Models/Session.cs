using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class Session
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string RefreshTokenHash { get; set; } = null!;

    public string? DeviceName { get; set; }

    public string? IpAddress { get; set; }

    public DateTime LastActiveAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
