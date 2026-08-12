using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class ScraperRun
{
    public long Id { get; set; }

    public long StoreId { get; set; }

    public int ItemsScraped { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime StartedAt { get; set; }

    public DateTime? FinishedAt { get; set; }

    public virtual Store Store { get; set; } = null!;
}
