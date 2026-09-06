using System.ComponentModel.DataAnnotations;
using Pricely.Api.Models;
using Pricely.Core.Entities;

namespace Pricely.Api.Dtos;

public record TeamMemberView(
    long Id,
    string Name,
    string Email,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAt);

public record TeamRequestView(
    long Id,
    string Email,
    string? Name,
    string RequestedRole,
    string Type,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt,

    /// <summary>
    /// The raw invite code, returned ONLY when the invite email could not be
    /// sent, so the admin who created it can pass it on another way. Null on
    /// every other response, including every listing — this is not a field to
    /// read an existing invite's code out of.
    /// </summary>
    string? ShareToken = null);

/// <summary>
/// Roles an admin is allowed to hand out. Deliberately excludes User: the
/// team endpoints manage back-office staff, and turning a colleague into a
/// shopper (or a shopper into staff) is not what "change role" means here.
/// </summary>
public enum AssignableRole
{
    Admin,
    Support,
    ReadOnly
}

public record InviteMemberInput(
    [Required, EmailAddress, StringLength(255)] string Email,
    [Required] AssignableRole Role);

public record RoleChangeInput(
    [Required] AssignableRole Role);

public record AcceptInviteRequest(
    [Required] string Token,
    [Required, StringLength(120, MinimumLength = 2)] string Name,
    [Required, StringLength(100, MinimumLength = 8)] string Password);

public record ActivityLogDto(
    long Id,
    string ActorName,
    string Action,
    string? TargetType,
    long? TargetId,
    DateTimeOffset CreatedAt);

public static class RoleMapping
{
    public static UserRole ToUserRole(this AssignableRole role) => role switch
    {
        AssignableRole.Admin => UserRole.Admin,
        AssignableRole.Support => UserRole.Support,
        AssignableRole.ReadOnly => UserRole.ReadOnly,

        // Unreachable while AssignableRole has only these three, but throwing
        // beats a default arm: silently falling back to any role here would be
        // a privilege bug the compiler would never catch.
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, "Unrecognised role.")
    };
}
