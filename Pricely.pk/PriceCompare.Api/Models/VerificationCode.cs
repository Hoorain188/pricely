using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class VerificationCode
{
    public long Id { get; set; }

    public string Email { get; set; } = null!;

    public string CodeHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public DateTime? UsedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
