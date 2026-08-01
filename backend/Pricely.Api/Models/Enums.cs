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
