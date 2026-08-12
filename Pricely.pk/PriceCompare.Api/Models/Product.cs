using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class Product
{
    public long Id { get; set; }

    public string Name { get; set; } = null!;

    public long? CategoryId { get; set; }

    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Category? Category { get; set; }

    public virtual ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();

    public virtual ICollection<PriceAlert> PriceAlerts { get; set; } = new List<PriceAlert>();

    public virtual ICollection<StoreListing> StoreListings { get; set; } = new List<StoreListing>();
}
