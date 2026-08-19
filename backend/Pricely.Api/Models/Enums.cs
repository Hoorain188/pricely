using Pricely.Core.Entities;

namespace Pricely.Api.Models;

/// <summary>
/// One spelling for every enum that crosses the wire — lowercase, matching
/// both the Postgres labels and the app's
/// 'admin' | 'support' | 'readonly' | 'user' union type.
///
/// Needed because .ToString() is not consistent: inside a LINQ projection EF
/// translates it to a SQL cast and yields the lowercase Postgres label, while
/// in memory it yields the PascalCase C# name. That mismatch once shipped
/// "admin" from one endpoint and "Admin" from another.
///
/// ToLowerInvariant() is not a substitute either: SelfSignup must become
/// "self_signup", not "selfsignup".
/// </summary>
public static class WireNames
{
    public static string ToWire(this UserRole role) => role switch
    {
        UserRole.Admin => "admin",
        UserRole.Support => "support",
        UserRole.ReadOnly => "readonly",
        UserRole.User => "user",
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, "Unrecognised role.")
    };

    public static string ToWire(this TeamRequestType type) => type switch
    {
        TeamRequestType.Invite => "invite",
        TeamRequestType.SelfSignup => "self_signup",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Unrecognised request type.")
    };

    public static string ToWire(this TeamRequestStatus status) => status switch
    {
        TeamRequestStatus.Pending => "pending",
        TeamRequestStatus.Approved => "approved",
        TeamRequestStatus.Rejected => "rejected",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unrecognised status.")
    };
}
