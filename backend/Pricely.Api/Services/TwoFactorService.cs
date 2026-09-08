using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OtpNet;
using Pricely.Core.Entities;
using Pricely.Infrastructure;

namespace Pricely.Api.Services;

/// <summary>
/// Two-factor authentication with an authenticator app.
///
/// TOTP rather than an emailed or texted code: the phone derives the code
/// offline from a shared secret, so it needs no mail route and no SMS
/// credit, and nothing travels that could be intercepted on the way.
/// </summary>
public interface ITwoFactorService
{
    /// <summary>
    /// Starts setup. Returns the secret and the otpauth:// URI the app turns
    /// into a QR code. Does NOT switch 2FA on — that needs a confirmed code,
    /// so someone who scans nothing is not locked out.
    /// </summary>
    Task<(string Secret, string OtpAuthUri)> BeginSetupAsync(long userId, CancellationToken ct = default);

    /// <summary>
    /// Confirms the first code and switches 2FA on. Returns the recovery
    /// codes, which are shown once and never again.
    /// </summary>
    Task<List<string>> ConfirmSetupAsync(long userId, string code, CancellationToken ct = default);

    /// <summary>Checks a code at sign-in. Accepts a TOTP code or an unused recovery code.</summary>
    Task<bool> VerifyAsync(long userId, string code, CancellationToken ct = default);

    /// <summary>Turns 2FA off and discards the secret and every recovery code.</summary>
    Task DisableAsync(long userId, CancellationToken ct = default);

    Task<int> RemainingBackupCodesAsync(long userId, CancellationToken ct = default);

    /// <summary>
    /// Issues a fresh set and voids the old ones. Separate from confirming
    /// setup, which re-checks a TOTP code — the caller here has already been
    /// verified, possibly with a recovery code, which would fail that check.
    /// </summary>
    Task<List<string>> RegenerateBackupCodesAsync(long userId, CancellationToken ct = default);
}

public class TwoFactorService : ITwoFactorService
{
    private const int BackupCodeCount = 8;

    /// <summary>
    /// One step either side of now. Phone clocks drift, and a code rejected
    /// because a watch is forty seconds fast is indistinguishable, to the
    /// person typing it, from 2FA being broken.
    /// </summary>
    private static readonly VerificationWindow Window = new(previous: 1, future: 1);

    private readonly AppDbContext _db;
    private readonly ILogger<TwoFactorService> _logger;

    public TwoFactorService(AppDbContext db, ILogger<TwoFactorService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(string Secret, string OtpAuthUri)> BeginSetupAsync(long userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("not_found", "Account not found.", StatusCodes.Status404NotFound);

        if (user.TotpEnabled)
            throw new AuthException("already_enabled", "Two-factor authentication is already on for this account.");

        // A fresh secret every time setup is started. Reusing one would mean a
        // half-finished attempt on an old phone still worked.
        var secretBytes = RandomNumberGenerator.GetBytes(20);
        var secret = Base32Encoding.ToString(secretBytes);

        user.TotpSecret = secret;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        // The label is what shows in the authenticator app's list, so it has
        // to say both which service and which account.
        var uri = $"otpauth://totp/Pricely:{Uri.EscapeDataString(user.Email)}"
                + $"?secret={secret}&issuer=Pricely&algorithm=SHA1&digits=6&period=30";

        return (secret, uri);
    }

    public async Task<List<string>> ConfirmSetupAsync(long userId, string code, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("not_found", "Account not found.", StatusCodes.Status404NotFound);

        if (string.IsNullOrWhiteSpace(user.TotpSecret))
            throw new AuthException("not_started", "Start two-factor setup before confirming it.");

        if (!VerifyTotp(user.TotpSecret, code))
            throw new AuthException("invalid_code", "That code isn't right. Check the app and try again.");

        user.TotpEnabled = true;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Two-factor enabled for user {UserId}", userId);

        return await RegenerateBackupCodesAsync(userId, ct);
    }

    public async Task<List<string>> RegenerateBackupCodesAsync(long userId, CancellationToken ct = default)
    {
        // Any codes from a previous round are void — an old printout must stop
        // working the moment a new one is issued.
        await _db.BackupCodes.Where(b => b.UserId == userId).ExecuteDeleteAsync(ct);

        var plain = new List<string>();
        foreach (var _ in Enumerable.Range(0, BackupCodeCount))
        {
            var value = GenerateBackupCode();
            plain.Add(value);
            _db.BackupCodes.Add(new BackupCode
            {
                UserId = userId,
                // Hashed in its normalised form, not as displayed. The dash is
                // there to make it readable on paper; hashing the pretty
                // version meant a code typed without it never matched, which
                // is exactly how anyone would type it back.
                CodeHash = BCrypt.Net.BCrypt.HashPassword(NormaliseBackupCode(value)),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return plain;
    }

    public async Task<bool> VerifyAsync(long userId, string code, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !user.TotpEnabled || string.IsNullOrWhiteSpace(user.TotpSecret)) return false;

        var cleaned = NormaliseBackupCode(code);

        // TOTP is checked against the code as typed, digits only — normalising
        // for backup codes would not change six digits anyway.
        if (VerifyTotp(user.TotpSecret, code.Trim())) return true;

        // Not a TOTP code — try the recovery codes. Each is single use, so a
        // match is spent immediately.
        var unused = await _db.BackupCodes
            .Where(b => b.UserId == userId && b.UsedAt == null)
            .ToListAsync(ct);

        foreach (var backup in unused)
        {
            if (!BCrypt.Net.BCrypt.Verify(cleaned, backup.CodeHash)) continue;

            backup.UsedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);

            _logger.LogWarning(
                "User {UserId} signed in with a recovery code; {Left} left", userId, unused.Count - 1);
            return true;
        }

        return false;
    }

    public async Task DisableAsync(long userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AuthException("not_found", "Account not found.", StatusCodes.Status404NotFound);

        user.TotpEnabled = false;
        user.TotpSecret = null;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.BackupCodes.Where(b => b.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Two-factor disabled for user {UserId}", userId);
    }

    public Task<int> RemainingBackupCodesAsync(long userId, CancellationToken ct = default) =>
        _db.BackupCodes.CountAsync(b => b.UserId == userId && b.UsedAt == null, ct);

    /// <summary>
    /// One form to hash and compare against, whatever the person types:
    /// spaces and dashes dropped, letters uppercased. These are read off
    /// paper, so "c4hd8 u53h9" has to be the same code as "C4HD8-U53H9".
    /// </summary>
    private static string NormaliseBackupCode(string code) =>
        code.Replace(" ", "").Replace("-", "").Trim().ToUpperInvariant();

    private static bool VerifyTotp(string base32Secret, string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;

        try
        {
            var totp = new Totp(Base32Encoding.ToBytes(base32Secret));
            return totp.VerifyTotp(code.Trim(), out _, Window);
        }
        catch (Exception)
        {
            // A malformed secret or a non-numeric code is a failed check, not
            // a server error.
            return false;
        }
    }

    /// <summary>
    /// Ten characters from an alphabet with no 0/O or 1/I/L, because these get
    /// written on paper and read back by a person.
    /// </summary>
    private static string GenerateBackupCode()
    {
        const string alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        var chars = new char[10];

        for (var i = 0; i < chars.Length; i++)
            chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];

        return new string(chars[..5]) + "-" + new string(chars[5..]);
    }
}
