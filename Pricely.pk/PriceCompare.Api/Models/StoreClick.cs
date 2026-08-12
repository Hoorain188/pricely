using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class StoreClick
{
    public long Id { get; set; }

    public long? UserId { get; set; }

    public long StoreListingId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual StoreListing StoreListing { get; set; } = null!;

    public virtual User? User { get; set; }
}
