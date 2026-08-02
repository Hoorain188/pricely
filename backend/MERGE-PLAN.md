# Merging `feature/backend-auth` into `feature/backend-admin`

Two people built two halves of one API in the same folder. The good news from a
trial merge: **21 of 27 files merged cleanly.** Only six conflict, and all six
are configuration — none of the actual logic collides.

This document is for both of us to agree on before anyone starts merging.

---

## What each side built

| | Auth branch | Admin branch |
|---|---|---|
| Endpoints | 11 auth routes (`/api/auth/...`) | 20+ admin routes (`/api/v1/admin/...`) |
| DbContext | `Pricely.Api/Data/PricelyDbContext.cs` — 4 tables | `Pricely.Infrastructure/AppDbContext.cs` — 18 tables |
| Entities | `Pricely.Api/Models/` — User, Session, TeamRequest, VerificationCode | `Pricely.Core/Entities.cs` — all 18 |
| Enums | `Models/Enums.cs` | `Pricely.Core/Enum.cs` |
| Extras | `IEmailSender` + Gmail sender, exception middleware, JWT service | Activity logger, current-user service |
| Layout | Everything in `Pricely.Api` | Split across Api / Core / Infrastructure |

**The enums are byte-for-byte equivalent.** Both used `[PgName]` with the same
labels. Nothing to reconcile there — just delete one copy.

---

## The one decision that has to be made first

**Which DbContext survives?**

They cannot coexist: two contexts mapping the same tables means EF has two
opinions about the same rows, and whichever one a controller happens to inject
wins.

**Recommendation: keep `AppDbContext` (18 tables), delete `PricelyDbContext`.**

Not because it is better written — because it is a superset. It already maps
User, Session, TeamRequest and VerificationCode along with everything else, so
auth loses nothing. Going the other way means adding 14 tables to the auth
context, which is the same work plus more risk.

If we keep `AppDbContext`, the auth code changes are mechanical:

```csharp
// AuthService.cs, TokenService.cs, AuthController.cs
- using Pricely.Api.Data;
+ using Pricely.Infrastructure;

- private readonly PricelyDbContext _db;
+ private readonly AppDbContext _db;
```

Property names line up already (`Users`, `Sessions`, `TeamRequests`,
`VerificationCodes`), so nothing below that line has to change.

**One real gap:** `AppDbContext` does not yet map `users.email_verified_at` or
`team_requests.user_id` — the two columns `002_auth_columns.sql` added. Those
need adding to `Entities.cs` or auth will not be able to read them.

---

## The six conflicting files

### 1. `Program.cs` — the big one

Both wrote a whole file. Neither can simply win: auth needs JWT + email +
exception middleware, admin needs the activity logger + current-user service,
and both need the DbContext and CORS.

Merge by hand into one file with these sections in order:

```
1. DbContext            (admin's version — it registers all six Postgres enums)
2. JWT authentication   (auth's)
3. Options binding      (auth's — JwtOptions, EmailOptions)
4. Services             (both: IEmailSender, ITokenService, IAuthService,
                         ICurrentUser, IActivityLogger)
5. Controllers, OpenAPI, CORS  (either — they are identical)
6. Middleware order     (auth's exception middleware FIRST, then
                         UseCors → UseAuthentication → UseAuthorization)
```

Middleware order matters and is easy to get wrong: authentication must run
before authorization, and the exception handler has to wrap both to catch
anything they throw.

### 2. `Pricely.Api.csproj`

Union of both package lists. Keep every `PackageReference` from both sides and
both `ProjectReference` lines (Core, Infrastructure).

**Check the `TargetFramework`.** The auth README says .NET 8; the admin side is
on `net10.0`. Pick one — `net10.0`, since .NET 8 goes out of support in
November 2026 — and make sure the packages resolve.

### 3. `appsettings.json` / `appsettings.Development.json`

Union. Auth's has `Jwt` and `Email` sections; admin's has logging config.
Neither contains secrets, so this is a straight paste-together.

### 4. `launchSettings.json`

Pick one port. Auth uses 5099, admin uses 5059. One API, one port — and
whichever we drop, the `.env` in the mobile app has to change to match.

### 5. `Pricely.Api.http`

Concatenate. Auth's requests first, then admin's. No logic, just test calls.

---

## Two things that already fit together

Worth noticing, because neither of us planned it:

**The admin approval queue is complete.** The auth README lists as a known gap:
*"Approve/reject endpoints aren't built yet."* They exist on the admin branch —
`GET /admin/team/requests`, `POST .../approve`, `POST .../reject` — along with
the Manage Team Access screen that drives them. Auth fills the queue, admin
empties it.

*To verify:* auth's admin-tab signup must write `team_requests.type =
'self_signup'`, since that is what the admin query filters on.

**Email is solved.** `IEmailSender` means invite emails and the notification
toggles can become real without building an email service twice.

---

## Open questions for whoever merges

1. **Password hashes.** The admin seed data uses `PLACEHOLDER` for
   `password_hash`, so none of those accounts (Bilal, Ayesha, Usman, Zainab,
   Noor) can log in. Either auth regenerates them with the real hasher, or we
   create those accounts through signup instead.

2. **Route prefixes differ.** Auth is `/api/auth/...`, admin is
   `/api/v1/admin/...`. Not a conflict, but inconsistent. Worth agreeing on one
   before the app hardcodes both.

3. **`[Authorize]` on admin routes.** Every admin endpoint is currently open —
   they carry `// TODO: [Authorize(Roles = ...)]` comments. Once JWTs work,
   those go live. This must happen before anything is deployed.

4. **Which database?** Auth's README says to use Neon. Admin is already on Neon.
   Confirm we are both pointing at the same one, or the two halves will be
   tested against different data.

---

## Suggested order of work

1. Agree on the DbContext (above)
2. Merge on a scratch branch — `git checkout -b merge/backend` — so neither
   feature branch breaks if it goes badly
3. Resolve the six files
4. `dotnet build` until clean
5. Run both `.http` files end to end
6. Only then merge into `main`

Do it together in one sitting. Split across two people working separately, the
same conflicts appear twice.