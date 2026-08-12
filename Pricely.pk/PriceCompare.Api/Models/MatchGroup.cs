using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class MatchGroup
{
    public long Id { get; set; }

    public decimal Confidence { get; set; }

    public long? ResolvedBy { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? ResolvedByNavigation { get; set; }

    public virtual ICollection<StoreListing> StoreListings { get; set; } = new List<StoreListing>();
}
