using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace PriceCompare.Api.Models;

public partial class StoreListing
{
    public long Id { get; set; }

    public long StoreId { get; set; }

    public long? ProductId { get; set; }

    public string RawTitle { get; set; } = null!;

    public decimal Price { get; set; }

    public bool InStock { get; set; }

    public string? ProductUrl { get; set; }

    public string? ImageUrl { get; set; }

    [Column("category")]
    public string? Category { get; set; }

    public DateTime ScrapedAt { get; set; }

    public virtual ICollection<PriceHistory> PriceHistories { get; set; } = new List<PriceHistory>();

    public virtual Product? Product { get; set; }

    public virtual Store Store { get; set; } = null!;

    public virtual ICollection<StoreClick> StoreClicks { get; set; } = new List<StoreClick>();

    public virtual ICollection<MatchGroup> MatchGroups { get; set; } = new List<MatchGroup>();
}