using System.Security.Cryptography;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pricely.Infrastructure;
using Pricely.Core.Entities;
using Pricely.Api.Dtos;
using Pricely.Api.Models;

namespace Pricely.Api.Services;

public class AuthService
{
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IEmailSender _email;
    private readonly IActivityLogger _activity;
    private readonly JwtOptions _jwt;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext db,
        ITokenService tokens,
        IEmailSender email,
        IActivityLogger activity,
        IOptions<JwtOptions> jwt,
        ILogger<AuthService> logger)
    {
        _db = db;
        _tokens = tokens;
        _email = email;
        _activity = activity;
        _jwt = jwt.Value;
        _logger = logger;
    }

    // ── Signup ───────────────────────────────────────────────────────────

    public async Task<AuthStatusResponse> SignupAsync(SignupRequest req, CancellationToken ct)
    {
        var email = Normalize(req.Email);

        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // The ADMIN tab only ever *requests* Admin. Support and Read-only are
        // assigned by an existing admin later; nobody can pick them at signup.
        var role = req.Portal == Portal.Admin ? UserRole.Admin : UserRole.User;

        if (existing is not null)
        {
            // A verified account is a real account — send them to sign in.
            if (existing.EmailVerifiedAt is not null)
                throw new AuthException("email_taken", "An account with this email already exists — try signing in instead.");

            // Never verified: the row is a dead end. They cannot sign in to it
            // and cannot sign up over it, so they are stranded for good. Treat
            // this as a fresh attempt — take the new details, reissue a code.
            existing.Name = req.Name.Trim();
            existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
            existing.Role = role;
            existing.IsActive = false;
            await _db.SaveChangesAsync(ct);

            await IssueCodeAsync(email, VerificationPurpose.Signup, ct);
            return new AuthStatusResponse(
                "verification_sent",
                $"We sent a 6-digit code to {email}. Enter it to finish creating your account.");
        }

        var user = new User
        {
            Name = req.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = role,
            IsActive = false,          // flipped on once the email code is confirmed
            EmailVerifiedAt = null
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        await IssueCodeAsync(email, VerificationPurpose.Signup, ct);

        return new AuthStatusResponse(
            "verification_sent",
            $"We sent a 6-digit code to {email}. Enter it to finish creating your account.");
    }

    // ── Verify the signup code ───────────────────────────────────────────

    public async Task<object> VerifySignupAsync(VerifyCodeRequest req, string? ip, CancellationToken ct)
    {
        var email = Normalize(req.Email);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new AuthException("not_found", "No account is waiting on verification for that email.", StatusCodes.Status404NotFound);

        await ConsumeCodeAsync(email, req.Code, VerificationPurpose.Signup, ct);

        user.EmailVerifiedAt = DateTimeOffset.UtcNow;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        // Shoppers are in immediately. Back-office signups are not: they go to
        // the pending queue an existing admin reviews, and stay inactive until
        // then — this is the approval gate, so it must not fall through.
        if (user.Role == UserRole.User)
        {
            user.IsActive = true;
            await _db.SaveChangesAsync(ct);
            return await IssueSessionAsync(user, req.DeviceName, ip, ct);
        }

        var alreadyQueued = await _db.TeamRequests.AnyAsync(
            t => t.UserId == user.Id && t.Status == TeamRequestStatus.Pending, ct);

        if (!alreadyQueued)
        {
            _db.TeamRequests.Add(new TeamRequest
            {
                Email = user.Email,
                Name = user.Name,
                RequestedRole = user.Role,
                Type = TeamRequestType.SelfSignup,
                Status = TeamRequestStatus.Pending,
                UserId = user.Id
            });
        }

        await _db.SaveChangesAsync(ct);

        return new AuthStatusResponse(
            "pending_approval",
            "Your admin access request has been sent to the Pricely team. You'll be able to sign in once an existing admin approves it.");
    }

    // ── Login ────────────────────────────────────────────────────────────

    public async Task<AuthResponse> LoginAsync(LoginRequest req, string? ip, CancellationToken ct)
    {
        var email = Normalize(req.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Same message whether the email is unknown or the password is wrong,
        // so this can't be used to discover which emails have accounts.
        if (user is null || !VerifyPassword(req.Password, user.PasswordHash, email))
            throw new AuthException("invalid_credentials", "Incorrect email or password.", StatusCodes.Status401Unauthorized);

        if (user.EmailVerifiedAt is null)
            throw new AuthException("email_not_verified", "Please verify your email first — check your inbox for the code.");

        // The tab is only ever checked against the stored role; it never grants
        // anything. A tampered client sending Portal.Admin gets nowhere unless
        // the row in the database already says so.
        var wantsBackOffice = req.Portal == Portal.Admin;
        var isBackOffice = user.Role != UserRole.User;
        if (wantsBackOffice != isBackOffice)
            throw new AuthException("invalid_credentials", "Incorrect email or password.", StatusCodes.Status401Unauthorized);

        if (!user.IsActive)
        {
            var pending = await _db.TeamRequests.AnyAsync(
                t => t.UserId == user.Id && t.Status == TeamRequestStatus.Pending, ct);

            throw new AuthException(
                pending ? "pending_approval" : "account_disabled",
                pending
                    ? "Your access request is still waiting for an admin to approve it."
                    : "This account has been disabled. Contact an administrator.",
                StatusCodes.Status403Forbidden);
        }

        return await IssueSessionAsync(user, req.DeviceName, ip, ct);
    }

    // ── Forgot / reset password ──────────────────────────────────────────

    public async Task<AuthStatusResponse> ForgotPasswordAsync(ForgotPasswordRequest req, CancellationToken ct)
    {
        var email = Normalize(req.Email);
        var exists = await _db.Users.AnyAsync(u => u.Email == email, ct);

        if (exists)
        {
            await IssueCodeAsync(email, VerificationPurpose.PasswordReset, ct);
        }
        else
        {
            // Deliberately silent. Telling the caller "no such account" would
            // turn this endpoint into a way to test which emails are registered.
            _logger.LogInformation("Password reset requested for unknown email {Email}", email);
        }

        return new AuthStatusResponse(
            "reset_code_sent",
            $"If an account exists for {email}, a reset code is on its way.");
    }

    /// <summary>
    /// Reissues a code for someone stuck on the verify screen — the "Resend"
    /// button. Retires the previous code, so only the newest one works.
    ///
    /// Reports the same thing no matter what, for the same reason
    /// forgot-password does: otherwise it becomes a way to test which emails
    /// are registered, and which of those have finished verifying.
    /// </summary>
    public async Task<AuthStatusResponse> ResendCodeAsync(ResendCodeRequest req, CancellationToken ct)
    {
        var email = Normalize(req.Email);
        var purpose = req.Purpose == CodePurpose.Signup
            ? VerificationPurpose.Signup
            : VerificationPurpose.PasswordReset;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // A signup code is pointless once the address is already confirmed,
        // so that case is skipped rather than mailing a code nobody needs.
        var worthSending = user is not null &&
            (purpose == VerificationPurpose.PasswordReset || user.EmailVerifiedAt is null);

        if (worthSending)
            await IssueCodeAsync(email, purpose, ct);
        else
            _logger.LogInformation("Resend requested for {Email} with nothing to send", email);

        return new AuthStatusResponse("verification_sent", $"If a code is needed for {email}, a new one is on its way.");
    }

    /// <summary>
    /// Checks the reset code without spending it, so the app can move to the
    /// "set a new password" screen. The code is consumed by ResetPasswordAsync.
    /// </summary>
    public async Task<AuthStatusResponse> VerifyResetCodeAsync(VerifyCodeRequest req, CancellationToken ct)
    {
        var email = Normalize(req.Email);
        await FindValidCodeAsync(email, req.Code, VerificationPurpose.PasswordReset, ct);

        return new AuthStatusResponse("code_valid", "Code verified. Choose a new password.");
    }

    public async Task<AuthStatusResponse> ResetPasswordAsync(ResetPasswordRequest req, CancellationToken ct)
    {
        var email = Normalize(req.Email);

        var user = await _db.Users
            .Include(u => u.Sessions)
            .FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new AuthException("not_found", "No account found for that email.", StatusCodes.Status404NotFound);

        await ConsumeCodeAsync(email, req.Code, VerificationPurpose.PasswordReset, ct);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;

        // Whoever changed this password may be locking out someone who had the
        // old one, so every existing device is signed out.
        var now = DateTimeOffset.UtcNow;
        foreach (var session in user.Sessions.Where(s => s.RevokedAt is null))
            session.RevokedAt = now;

        await _db.SaveChangesAsync(ct);

        return new AuthStatusResponse("password_reset", "Password updated. You can sign in with it now.");
    }

    // ── Sessions ─────────────────────────────────────────────────────────

    public async Task<AuthResponse> RefreshAsync(RefreshRequest req, CancellationToken ct)
    {
        var hash = _tokens.HashRefreshToken(req.RefreshToken);

        var session = await _db.Sessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.RefreshTokenHash == hash && s.RevokedAt == null, ct)
            ?? throw new AuthException("invalid_refresh_token", "Session expired. Please sign in again.", StatusCodes.Status401Unauthorized);

        if (session.CreatedAt.AddDays(_jwt.RefreshTokenDays) < DateTimeOffset.UtcNow)
        {
            session.RevokedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            throw new AuthException("invalid_refresh_token", "Session expired. Please sign in again.", StatusCodes.Status401Unauthorized);
        }

        if (!session.User.IsActive)
            throw new AuthException("account_disabled", "This account is no longer active.", StatusCodes.Status403Forbidden);

        // Rotate the refresh token on every use: a stolen one stops working as
        // soon as the real device refreshes with it.
        var refreshToken = _tokens.CreateRefreshToken();
        session.RefreshTokenHash = _tokens.HashRefreshToken(refreshToken);
        session.LastActiveAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new AuthResponse(_tokens.CreateAccessToken(session.User), refreshToken, ToDto(session.User));
    }

    public async Task LogoutAsync(RefreshRequest req, CancellationToken ct)
    {
        var hash = _tokens.HashRefreshToken(req.RefreshToken);
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.RefreshTokenHash == hash, ct);

        if (session is { RevokedAt: null })
        {
            session.RevokedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<List<SessionDto>> GetSessionsAsync(long userId, string? currentRefreshToken, CancellationToken ct)
    {
        var currentHash = currentRefreshToken is null ? null : _tokens.HashRefreshToken(currentRefreshToken);

        return await _db.Sessions
            .Where(s => s.UserId == userId && s.RevokedAt == null)
            .OrderByDescending(s => s.LastActiveAt)
            .Select(s => new SessionDto(
                s.Id,
                s.DeviceName,
                s.IpAddress,
                s.LastActiveAt,
                s.CreatedAt,
                currentHash != null && s.RefreshTokenHash == currentHash))
            .ToListAsync(ct);
    }

    public async Task RevokeSessionAsync(long userId, long sessionId, CancellationToken ct)
    {
        var session = await _db.Sessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, ct)
            ?? throw new AuthException("not_found", "That session no longer exists.", StatusCodes.Status404NotFound);

        session.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static string Normalize(string email) => email.Trim().ToLowerInvariant();

    /// <summary>
    /// Checks a password, treating an unreadable stored hash as "wrong password"
    /// rather than letting it escape as a 500.
    ///
    /// Rows seeded straight into the database can hold anything in password_hash
    /// — the existing demo customers hold the literal text
    /// "REPLACE_ME_NOT_A_REAL_HASH". BCrypt throws SaltParseException on those,
    /// which produced a 500 for seeded emails and a 401 for unknown ones. That
    /// difference is exactly the account-enumeration leak the identical error
    /// message exists to prevent, so both must fail the same way.
    /// </summary>
    private bool VerifyPassword(string password, string storedHash, string email)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, storedHash);
        }
        catch (SaltParseException)
        {
            // Worth surfacing: it means a row exists that can never be logged
            // into, which is a data problem even though it's handled safely.
            _logger.LogWarning(
                "Account {Email} has an unusable password hash — login refused. " +
                "Was this row seeded directly into the database?", email);
            return false;
        }
    }

    private static UserDto ToDto(User u) => new(u.Id, u.Name, u.Email, u.Role.ToWire());

    private async Task<AuthResponse> IssueSessionAsync(User user, string? deviceName, string? ip, CancellationToken ct)
    {
        var refreshToken = _tokens.CreateRefreshToken();

        _db.Sessions.Add(new Session
        {
            UserId = user.Id,
            RefreshTokenHash = _tokens.HashRefreshToken(refreshToken),
            DeviceName = string.IsNullOrWhiteSpace(deviceName) ? "Unknown device" : deviceName.Trim(),
            IpAddress = ip
        });

        await _db.SaveChangesAsync(ct);

        return new AuthResponse(_tokens.CreateAccessToken(user), refreshToken, ToDto(user));
    }

    private async Task IssueCodeAsync(string email, VerificationPurpose purpose, CancellationToken ct)
    {
        // Retire any earlier codes so only the newest one works.
        var now = DateTimeOffset.UtcNow;
        var previous = await _db.VerificationCodes
            .Where(v => v.Email == email && v.Purpose == purpose && v.UsedAt == null)
            .ToListAsync(ct);
        foreach (var old in previous)
            old.UsedAt = now;

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        _db.VerificationCodes.Add(new VerificationCode
        {
            Email = email,
            CodeHash = BCrypt.Net.BCrypt.HashPassword(code),
            Purpose = purpose,
            ExpiresAt = now.Add(CodeLifetime)
        });

        await _db.SaveChangesAsync(ct);

        if (purpose == VerificationPurpose.Signup)
            await _email.SendVerificationCodeAsync(email, code, ct);
        else
            await _email.SendPasswordResetCodeAsync(email, code, ct);
    }

    private async Task<VerificationCode> FindValidCodeAsync(
        string email, string code, VerificationPurpose purpose, CancellationToken ct)
    {
        var record = await _db.VerificationCodes
            .Where(v => v.Email == email && v.Purpose == purpose && v.UsedAt == null)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (record is null || !record.IsUsable(DateTimeOffset.UtcNow))
            throw new AuthException("invalid_code", "That code is expired or already used. Request a new one.");

        if (!BCrypt.Net.BCrypt.Verify(code, record.CodeHash))
        {
            // Each wrong guess is counted and persisted, so a 6-digit code
            // can't be walked through one request at a time. Five misses and
            // the code is dead — a new one has to be requested.
            record.Attempts++;
            await _db.SaveChangesAsync(ct);

            var remaining = VerificationCode.MaxAttempts - record.Attempts;
            throw new AuthException("invalid_code", remaining > 0
                ? $"That code isn't right. {remaining} attempt{(remaining == 1 ? "" : "s")} left."
                : "Too many wrong attempts. Request a new code.");
        }

        return record;
    }

    // ── Accepting a team invite ──────────────────────────────────────────

    /// <summary>
    /// Turns an emailed invite into a real, active back-office account. No
    /// second approval step: an existing admin already chose this person, and
    /// the token proves they control the invited mailbox.
    /// </summary>
    public async Task<AuthResponse> AcceptInviteAsync(AcceptInviteRequest req, string? ip, CancellationToken ct)
    {
        var tokenHash = _tokens.HashRefreshToken(req.Token);

        var invite = await _db.TeamRequests.FirstOrDefaultAsync(
            t => t.InviteToken == tokenHash
                 && t.Type == TeamRequestType.Invite
                 && t.Status == TeamRequestStatus.Pending, ct)
            ?? throw new AuthException("invalid_invite", "That invite is invalid or has already been used.");

        if (invite.ExpiresAt is { } expiry && expiry < DateTimeOffset.UtcNow)
            throw new AuthException("invalid_invite", "That invite has expired. Ask an admin to send a new one.");

        if (await _db.Users.AnyAsync(u => u.Email == invite.Email, ct))
            throw new AuthException("email_taken", "An account with this email already exists — try signing in instead.");

        var user = new User
        {
            Name = req.Name.Trim(),
            Email = invite.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = invite.RequestedRole,
            IsActive = true,

            // The invite went to this address and only its holder could produce
            // the token, so the mailbox is already proven — no second code.
            EmailVerifiedAt = DateTimeOffset.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        invite.Status = TeamRequestStatus.Approved;
        invite.UserId = user.Id;
        invite.Name = user.Name;
        invite.ReviewedAt = DateTimeOffset.UtcNow;
        invite.InviteToken = null;   // single use

        _activity.Record(ActivityActions.AcceptInvite, "team_request", invite.Id,
            new { invite.Email, role = user.Role.ToWire() });

        await _db.SaveChangesAsync(ct);

        return await IssueSessionAsync(user, "Invite signup", ip, ct);
    }

    private async Task ConsumeCodeAsync(string email, string code, VerificationPurpose purpose, CancellationToken ct)
    {
        var record = await FindValidCodeAsync(email, code, purpose, ct);
        record.UsedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}
