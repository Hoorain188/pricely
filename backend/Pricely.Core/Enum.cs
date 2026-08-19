using NpgsqlTypes;

namespace Pricely.Core.Entities;

public enum UserRole
{
    [PgName("admin")]    Admin,
    [PgName("support")]  Support,
    [PgName("readonly")] ReadOnly,
    [PgName("user")]     User
}

public enum MatchStatus
{
    [PgName("unmatched")]    Unmatched,
    [PgName("needs_review")] NeedsReview,
    [PgName("matched")]      Matched,
    [PgName("rejected")]     Rejected
}

public enum ScraperRunStatus
{
    [PgName("ok")]   Ok,
    [PgName("fail")] Fail
}

public enum TeamRequestStatus
{
    [PgName("pending")]  Pending,
    [PgName("approved")] Approved,
    [PgName("rejected")] Rejected
}

public enum TeamRequestType
{
    [PgName("invite")]      Invite,
    [PgName("self_signup")] SelfSignup
}

public enum VerificationPurpose
{
    [PgName("signup")]         Signup,
    [PgName("password_reset")] PasswordReset
}