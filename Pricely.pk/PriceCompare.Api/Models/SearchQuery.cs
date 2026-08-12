using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class SearchQuery
{
    public long Id { get; set; }

    public long? UserId { get; set; }

    public string QueryText { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
