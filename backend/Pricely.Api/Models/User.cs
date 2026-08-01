namespace Pricely.Api.Models;

public class User
{
    public long Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;

    /// <summary>BCrypt hash — never the password itself.</summary>
    public string PasswordHash { get; set; } = null!;

    public UserRole Role { get; set; } = UserRole.User;

    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// False while a back-office signup waits for an admin to approve it,
    /// or if an admin has since disabled the account. Login requires true.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Null until the emailed signup code has been confirmed.</summary>
    public DateTimeOffset? EmailVerifiedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
