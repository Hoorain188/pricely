using NpgsqlTypes;

namespace Pricely.Api.Models;

// These map onto the native Postgres enum types created in the schema.
// [PgName] is required wherever the C# name doesn't match the Postgres
// label exactly — e.g. ReadOnly would otherwise be sent as "read_only",
// which the user_role type would reject.

public enum UserRole
{
    [PgName("admin")] Admin,
    [PgName("support")] Support,
    [PgName("readonly")] ReadOnly,
    [PgName("user")] User
}

public static class UserRoleExtensions
{
    /// <summary>
    /// The single spelling every API response uses — lowercase, matching both
    /// the Postgres enum labels and the app's own
    /// 'admin' | 'support' | 'readonly' | 'user' union type.
    ///
    /// Needed because .ToString() is not consistent across the codebase: in a
    /// LINQ projection EF translates it to a SQL cast and yields the lowercase
    /// Postgres label, while in memory it yields the PascalCase C# name. That
    /// mismatch shipped "admin" from one endpoint and "Admin" from another.
    /// </summary>
    public static string ToWire(this UserRole role) => role switch
    {
        UserRole.Admin => "admin",
        UserRole.Support => "support",
        UserRole.ReadOnly => "readonly",
        UserRole.User => "user",
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, "Unrecognised role.")
    };

    // Same reasoning for the other enums. Note ToLowerInvariant() is NOT a
    // substitute here: SelfSignup would become "selfsignup", not the
    // "self_signup" the database and the app both use.
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

public enum VerificationPurpose
{
    [PgName("signup")] Signup,
    [PgName("password_reset")] PasswordReset
}

public enum TeamRequestStatus
{
    [PgName("pending")] Pending,
    [PgName("approved")] Approved,
    [PgName("rejected")] Rejected
}

public enum TeamRequestType
{
    [PgName("invite")] Invite,
    [PgName("self_signup")] SelfSignup
}
