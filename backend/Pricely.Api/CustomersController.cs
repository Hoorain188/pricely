using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pricely.Api.Authorization;
using Pricely.Core.Dtos;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/v1/admin/customers")]
// Customer names and email addresses, and an export that hands over the
// lot in one request. Nothing here is safe to serve unauthenticated.
[Authorize(Policy = Policies.BackOffice)]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;
    public CustomersController(AppDbContext db) => _db = db;

    /// <summary>App users, with their alert count. Drives the Customers tab.</summary>
    [HttpGet]
    public async Task<ActionResult<CustomersResponse>> List(
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var query = _db.Users.Where(u => u.Role == UserRole.User);

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(u =>
                EF.Functions.ILike(u.Name, $"%{q}%") ||
                EF.Functions.ILike(u.Email, $"%{q}%"));

        var total = await query.CountAsync(ct);

        var rows = await query
            .OrderBy(u => u.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id, u.Name, u.Email, u.IsActive,
                AlertCount = _db.PriceAlerts.Count(a => a.UserId == u.Id)
            })
            .ToListAsync(ct);

        var items = rows
            .Select(r => new CustomerDto(r.Id, r.Name, r.Email, r.AlertCount, r.IsActive))
            .ToList();

        return Ok(new CustomersResponse(
            total, items, page,
            TotalPages: (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Export all customers. Backs the "Export CSV" button.</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var rows = await _db.Users
            .Where(u => u.Role == UserRole.User)
            .OrderBy(u => u.Name)
            .Select(u => new
            {
                u.Id, u.Name, u.Email, u.CreatedAt, u.IsActive,
                AlertCount = _db.PriceAlerts.Count(a => a.UserId == u.Id)
            })
            .ToListAsync(ct);

        var sb = new StringBuilder("id,name,email,alerts,active,created_at\n");

        foreach (var r in rows)
            sb.Append($"{r.Id},{Csv(r.Name)},{Csv(r.Email)},{r.AlertCount},{r.IsActive},{r.CreatedAt:O}\n");

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "customers.csv");
    }

    /// <summary>Wrap in quotes and escape any quotes inside, so commas in names do not break the file.</summary>
    private static string Csv(string value) => $"\"{value.Replace("\"", "\"\"")}\"";
}