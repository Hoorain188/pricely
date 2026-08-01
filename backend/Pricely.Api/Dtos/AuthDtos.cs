using System.ComponentModel.DataAnnotations;

namespace Pricely.Api.Dtos;

/// <summary>
/// Which tab the person used on the auth screen. Deliberately NOT called
/// "role": it says which door they knocked on, and the server checks it
/// against the role stored in the database. It never grants anything.
/// </summary>
public enum Portal
{
    User,
    Admin
}

public record SignupRequest(
    [Required, StringLength(120, MinimumLength = 2)] string Name,
    [Required, EmailAddress, StringLength(255)] string Email,
    [Required, StringLength(100, MinimumLength = 8)] string Password,
    Portal Portal);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password,
    Portal Portal,
    string? DeviceName);

public record VerifyCodeRequest(
    [Required, EmailAddress] string Email,
    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be 6 digits.")] string Code,
    string? DeviceName);

public record ForgotPasswordRequest(
    [Required, EmailAddress] string Email);

public record ResetPasswordRequest(
    [Required, EmailAddress] string Email,
    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be 6 digits.")] string Code,
    [Required, StringLength(100, MinimumLength = 8)] string NewPassword);

public record RefreshRequest(
    [Required] string RefreshToken);

public record UserDto(long Id, string Name, string Email, string Role);

public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);

/// <summary>
/// What signup / verify return when there's no token yet — the app switches
/// screens on <see cref="Status"/> rather than parsing the message text.
/// </summary>
public record AuthStatusResponse(string Status, string Message);

public record SessionDto(
    long Id,
    string? DeviceName,
    string? IpAddress,
    DateTimeOffset LastActiveAt,
    DateTimeOffset CreatedAt,
    bool IsCurrentDevice);
