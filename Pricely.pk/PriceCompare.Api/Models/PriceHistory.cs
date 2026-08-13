using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class PriceHistory
{
    public long Id { get; set; }

    public long StoreListingId { get; set; }

    public decimal Price { get; set; }

    public DateTime RecordedAt { get; set; }

    public virtual StoreListing StoreListing { get; set; } = null!;
}
