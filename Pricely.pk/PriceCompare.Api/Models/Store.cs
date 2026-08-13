using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class Store
{
    public long Id { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string? BaseUrl { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<ScraperRun> ScraperRuns { get; set; } = new List<ScraperRun>();

    public virtual ICollection<StoreListing> StoreListings { get; set; } = new List<StoreListing>();
}
