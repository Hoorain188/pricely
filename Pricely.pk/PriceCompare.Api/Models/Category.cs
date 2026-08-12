using System;
using System.Collections.Generic;

namespace PriceCompare.Api.Models;

public partial class Category
{
    public long Id { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
