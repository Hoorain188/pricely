using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class TeamRequest
{
    public long Id { get; set; }

    public string Email { get; set; } = null!;

    public string? Name { get; set; }

    public long? InvitedBy { get; set; }

    public long? ReviewedBy { get; set; }

    public string? InviteToken { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public virtual User? InvitedByNavigation { get; set; }

    public virtual User? ReviewedByNavigation { get; set; }
}
