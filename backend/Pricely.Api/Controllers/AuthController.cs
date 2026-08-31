using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pricely.Api.Authorization;
using Pricely.Api.Dtos;
using Pricely.Api.Services;

namespace Pricely.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth) => _auth = auth;

    /// <summary>Creates the account and emails a 6-digit code. No login yet.</summary>
    [HttpPost("signup")]
    [EnableRateLimiting(RateLimitPolicies.EmailSending)]
    public async Task<ActionResult<AuthStatusResponse>> Signup(SignupRequest req, CancellationToken ct)
        => Ok(await _auth.SignupAsync(req, ct));

    /// <summary>
    /// Confirms the signup code. Shoppers get tokens back and are logged in;
    /// back-office signups get status "pending_approval" instead.
    /// </summary>
    [HttpPost("verify-signup")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<object>> VerifySignup(VerifyCodeRequest req, CancellationToken ct)
        => Ok(await _auth.VerifySignupAsync(req, ClientIp, ct));

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req, CancellationToken ct)
        => Ok(await _auth.LoginAsync(req, ClientIp, ct));

    [HttpPost("forgot-password")]
    [EnableRateLimiting(RateLimitPolicies.EmailSending)]
    public async Task<ActionResult<AuthStatusResponse>> ForgotPassword(ForgotPasswordRequest req, CancellationToken ct)
        => Ok(await _auth.ForgotPasswordAsync(req, ct));

    /// <summary>Reissues a code for someone stuck on the verify screen ("Resend").</summary>
    [HttpPost("resend-code")]
    [EnableRateLimiting(RateLimitPolicies.EmailSending)]
    public async Task<ActionResult<AuthStatusResponse>> ResendCode(ResendCodeRequest req, CancellationToken ct)
        => Ok(await _auth.ResendCodeAsync(req, ct));

    /// <summary>Checks the reset code so the app can advance to the new-password screen.</summary>
    [HttpPost("verify-reset-code")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<AuthStatusResponse>> VerifyResetCode(VerifyCodeRequest req, CancellationToken ct)
        => Ok(await _auth.VerifyResetCodeAsync(req, ct));

    [HttpPost("reset-password")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<AuthStatusResponse>> ResetPassword(ResetPasswordRequest req, CancellationToken ct)
        => Ok(await _auth.ResetPasswordAsync(req, ct));

    /// <summary>
    /// Turns an emailed team invite into an active account. No approval step —
    /// an admin already chose this person, and holding the token proves they
    /// control the invited mailbox.
    /// </summary>
    [HttpPost("accept-invite")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<AuthResponse>> AcceptInvite(AcceptInviteRequest req, CancellationToken ct)
        => Ok(await _auth.AcceptInviteAsync(req, ClientIp, ct));

    /// <summary>Trades a refresh token for a fresh access token (and a rotated refresh token).</summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest req, CancellationToken ct)
        => Ok(await _auth.RefreshAsync(req, ct));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest req, CancellationToken ct)
    {
        await _auth.LogoutAsync(req, ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<UserDto> Me() => Ok(new UserDto(
        CurrentUserId,
        User.FindFirstValue(ClaimNames.Name) ?? "",
        User.FindFirstValue(JwtRegisteredClaimNames.Email) ?? "",
        User.FindFirstValue(ClaimNames.Role) ?? ""));

    /// <summary>Backs the admin "Active sessions" screen.</summary>
    [Authorize]
    [HttpGet("sessions")]
    public async Task<ActionResult<List<SessionDto>>> Sessions(
        [FromQuery] string? currentRefreshToken, CancellationToken ct)
        => Ok(await _auth.GetSessionsAsync(CurrentUserId, currentRefreshToken, ct));

    [Authorize]
    [HttpDelete("sessions/{id:long}")]
    public async Task<IActionResult> RevokeSession(long id, CancellationToken ct)
    {
        await _auth.RevokeSessionAsync(CurrentUserId, id, ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("change-password")]
    [EnableRateLimiting(RateLimitPolicies.Sensitive)]
    public async Task<ActionResult<AuthStatusResponse>> ChangePassword(
        ChangePasswordRequest req,
        [FromQuery] string? currentRefreshToken,
        CancellationToken ct)
        => Ok(await _auth.ChangePasswordAsync(CurrentUserId, req, currentRefreshToken, ct));

    private long CurrentUserId =>
        long.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new AuthException("unauthorized", "Not signed in.", StatusCodes.Status401Unauthorized));

    private string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();
}
