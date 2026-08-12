using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class Favorite
{
    public long UserId { get; set; }

    public long ProductId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
