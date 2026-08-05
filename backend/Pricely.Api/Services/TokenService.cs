using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Pricely.Api.Models;

namespace Pricely.Api.Services;

public static class ClaimNames
{
    /// <summary>
    /// Short "role" rather than ClaimTypes.Role, which expands to a long
    /// WS-Federation URI and pads every token the app sends.
    /// </summary>
    public const string Role = "role";
    public const string Name = "name";
}

public interface ITokenService
{
    string CreateAccessToken(User user);
    string CreateRefreshToken();
    string HashRefreshToken(string refreshToken);
}

public class TokenService : ITokenService
{
    private readonly JwtOptions _options;

    public TokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;

        if (string.IsNullOrWhiteSpace(_options.SigningKey) || _options.SigningKey.Length < 32)
        {
            throw new InvalidOperationException(
                "Jwt:SigningKey is missing or shorter than 32 characters. " +
                "See backend/README.md for the user-secrets command to set it.");
        }
    }

    public string CreateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimNames.Name, user.Name),

            // The role the API authorises against. It is read from the database
            // row, never from anything the client sent — that's what stops a
            // tampered app from handing itself admin.
            new(ClaimNames.Role, user.Role.ToWire())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    /// <summary>
    /// Plain SHA-256 rather than BCrypt: refresh tokens are already 64 bytes of
    /// cryptographic randomness, so there's nothing to brute-force, and this
    /// runs on every refresh where BCrypt's slowness would just cost latency.
    /// </summary>
    public string HashRefreshToken(string refreshToken) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken)));
}
