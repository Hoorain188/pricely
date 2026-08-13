# Pricely API

ASP.NET Core 10 Web API backing the Pricely app: authentication (signup, email verification, login, password reset, sessions) and back-office team management (approvals, invites, roles).

The Expo app calls this directly — see `Pricely.pk/frontend.apk/config/api.ts`, which finds the API automatically in development by reusing the address Expo serves from, so there's no IP to keep updating.

## Getting it running

You need the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0). (The admin backend on `main` targets net10.0 too — matching it removes a merge conflict.)

### 1. Secrets

Nothing sensitive lives in `appsettings.json` — it holds empty placeholders and is committed. Real values go in **user-secrets**, which .NET stores outside the repo so they can't be pushed by accident.

```bash
cd backend/Pricely.Api

dotnet user-secrets set "ConnectionStrings:Postgres" "Host=<host>;Database=<database>;Username=<username>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true"

dotnet user-secrets set "Jwt:SigningKey" "$(openssl rand -base64 48)"
```

Ask Hoorain for the Neon connection details. Generate your **own** `Jwt:SigningKey` — it only needs to be consistent on one machine, and sharing it is what you'd avoid in production anyway.

### 2. Email (optional while developing)

```bash
dotnet user-secrets set "Email:FromAddress" "your.address@gmail.com"
dotnet user-secrets set "Email:SmtpPassword" "<16-char app password>"
```

That password is a **Gmail App Password**, not your normal one: turn on 2-Step Verification at [myaccount.google.com](https://myaccount.google.com/security) → **Security** → **App passwords** → create one.

Enter the app password **without spaces** — Google displays it as `abcd efgh ijkl mnop`, but it must be set as `abcdefghijklmnop`.

Skip this and the API still runs: in Development it falls back to printing codes to the console and logs a warning saying so. Outside Development it refuses to start without email configured, so a deployment can't silently stop sending mail.

**If sending fails with "An incomplete certificate revocation check occurred"** — that's a known macOS/.NET issue where the CA revocation lookup can't complete. It's already handled in `GmailEmailSender` by disabling only the revocation check; the certificate chain, hostname and expiry are still validated.

### 3. Run

```bash
dotnet run
```

The default profile binds **`http://0.0.0.0:5099`**, not `localhost`. That matters: on a phone "localhost" means the phone itself, so a localhost binding is unreachable from any other device and the app can only report that it can't reach the server. Port 5099 is what `Pricely.pk/frontend.apk/config/api.ts` expects.

Swagger UI is at the printed URL (e.g. `http://localhost:5099/swagger`). Health check at `/health`.

## Database

Tables were created by hand in SQL rather than generated from C#, so **the database is the source of truth** and the entity classes in `Models/` are written to match it.

`db/` holds the SQL, applied in order:

| File | What it did |
|---|---|
| `001_initial_schema.sql` | The original 18 tables |
| `002_auth_columns.sql` | Added `users.email_verified_at` and `team_requests.user_id` |
| `003_team_and_hardening.sql` | Code attempt counter, invite expiry, indexes |
| `004_bootstrap_first_admin.sql` | Promotes the very first admin (run once, by hand) |

If you change the schema, add a numbered file here and run it — don't only change it in pgAdmin, or nobody else gets the change.

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account, email a 6-digit code |
| POST | `/api/auth/verify-signup` | Confirm the code |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/forgot-password` | Email a reset code |
| POST | `/api/auth/resend-code` | Reissue a code for the verify screen's "Resend" |
| POST | `/api/auth/verify-reset-code` | Check the reset code (doesn't spend it) |
| POST | `/api/auth/reset-password` | Set a new password |
| POST | `/api/auth/refresh` | New access token from a refresh token |
| POST | `/api/auth/logout` | Revoke one session |
| GET | `/api/auth/me` | Current user (needs token) |
| GET | `/api/auth/sessions` | Logged-in devices (needs token) |
| DELETE | `/api/auth/sessions/{id}` | Log a device out (needs token) |
| POST | `/api/auth/accept-invite` | Turn an emailed team invite into an active account |

### Team management (`/api/admin/team`)

| Method | Route | Who |
|---|---|---|
| GET | `/members` | Admin, Support |
| GET | `/requests?status=` | Admin, Support |
| GET | `/activity?limit=` | Admin, Support |
| POST | `/requests/{id}/approve` | **Admin only** |
| POST | `/requests/{id}/reject` | **Admin only** |
| POST | `/invites` | **Admin only** |
| DELETE | `/invites/{id}` | **Admin only** |
| PATCH | `/members/{id}/role` | **Admin only** |
| DELETE | `/members/{id}` | **Admin only** |

Errors always come back as `{ "code": "...", "message": "..." }` — including validation failures, which are normalised into that shape so the app only ever has one error format to handle. Switch on `code`, show `message`.

Codes to handle in the app: `validation_error`, `email_taken`, `invalid_credentials`, `email_not_verified`, `pending_approval`, `account_disabled`, `invalid_code`, `invalid_invite`, `already_member`, `already_invited`, `already_reviewed`, `self_approval`, `self_demotion`, `self_removal`, `last_admin`, `rate_limited`.

Roles are always lowercase on the wire — `admin`, `support`, `readonly`, `user` — matching both the Postgres labels and the app's existing union type.

## How the roles work

`portal` in the login/signup body says **which tab the person used**, not what they get. The server reads the real role from the database and refuses if they don't match — so a tampered client sending `"portal": "admin"` gets nowhere.

Signing up through the ADMIN tab does **not** grant access. It creates the account inactive plus a `pending` row in `team_requests`; an existing admin has to approve it before login works. Shoppers are active as soon as they confirm their emailed code.

**Invites skip the queue.** An admin already chose that person, and holding the emailed token proves they control the mailbox — so accepting an invite creates an active account directly, no second approval and no separate email code.

### The first admin

Approving requires an existing admin, so the very first one can't be made through the API. Run `db/004_bootstrap_first_admin.sql` once — creating an admin from nothing needs direct database access, which is the right bar for that power.

### What's actually enforced

- Every `/api/admin/**` endpoint re-reads the user's row instead of trusting the role inside the token, so demoting or removing someone takes effect **immediately** rather than whenever their token expires.
- Admins can't approve their own request, demote themselves, or remove themselves.
- Rate limits per IP: 10 per 5 min on login and code entry, 5 per 15 min on anything that sends an email.
- A verification code locks after 5 wrong guesses.
- Changing a password or a role revokes every existing session for that user.
- Invite tokens are 48 random bytes, stored only as a SHA-256 hash, single-use, expiring after 7 days.

## Known gaps

Worth knowing before this goes anywhere real:

- **Two admins demoting each other at the same instant could leave zero admins.** The self-guards stop the realistic case, and `GuardLastAdminAsync` is a backstop, but neither closes that race — it needs serialisable isolation or a row lock. Unlikely with a 3-person team; fix before the team grows.
- **No automated tests.** Everything here was verified by hand against a real database. That's not a substitute for tests that run on every change.
- **`AllowAnyOrigin` CORS.** Fine for development, needs narrowing before deployment.
- **Rate limiting is per-IP and in-memory.** Everyone behind one office NAT shares a budget, and the counts reset when the API restarts (and aren't shared if you ever run more than one instance).
- **Removed members are deactivated, not deleted.** Their row stays so `activity_log` keeps working. There's no "permanently delete a person" path yet, which real privacy requests would eventually need.
