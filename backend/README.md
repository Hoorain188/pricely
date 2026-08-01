# Pricely API

ASP.NET Core 8 Web API backing the Pricely app. This branch covers **authentication only** — signup, email verification, login, password reset, and sessions.

## Getting it running

You need the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).

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

Skip this and the API still runs: in Development it falls back to printing codes to the console and logs a warning saying so. Outside Development it refuses to start without email configured, so a deployment can't silently stop sending mail.

### 3. Run

```bash
dotnet run
```

Swagger UI is at the printed URL (e.g. `http://localhost:5099/swagger`). Health check at `/health`.

## Database

Tables were created by hand in SQL rather than generated from C#, so **the database is the source of truth** and the entity classes in `Models/` are written to match it.

`db/` holds the SQL, applied in order:

| File | What it did |
|---|---|
| `001_initial_schema.sql` | The original 18 tables |
| `002_auth_columns.sql` | Added `users.email_verified_at` and `team_requests.user_id` |

If you change the schema, add a numbered file here and run it — don't only change it in pgAdmin, or nobody else gets the change.

## Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account, email a 6-digit code |
| POST | `/api/auth/verify-signup` | Confirm the code |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/forgot-password` | Email a reset code |
| POST | `/api/auth/verify-reset-code` | Check the reset code (doesn't spend it) |
| POST | `/api/auth/reset-password` | Set a new password |
| POST | `/api/auth/refresh` | New access token from a refresh token |
| POST | `/api/auth/logout` | Revoke one session |
| GET | `/api/auth/me` | Current user (needs token) |
| GET | `/api/auth/sessions` | Logged-in devices (needs token) |
| DELETE | `/api/auth/sessions/{id}` | Log a device out (needs token) |

Errors come back as `{ "code": "...", "message": "..." }`. Switch on `code`, show `message`.

Codes you'll want to handle in the app: `email_taken`, `invalid_credentials`, `email_not_verified`, `pending_approval`, `account_disabled`, `invalid_code`.

## How the roles work

`portal` in the login/signup body says **which tab the person used**, not what they get. The server reads the real role from the database and refuses the request if they don't match — so a tampered client sending `"portal": "admin"` gets nowhere.

Signing up through the ADMIN tab does **not** grant access. It creates the account inactive plus a `pending` row in `team_requests`; an existing admin has to approve it before login works. Shoppers are active as soon as they confirm their emailed code.

## Known gaps

Worth knowing before this goes anywhere real:

- **No rate limiting.** Nothing stops repeated login or code-guessing attempts. Codes are 6 digits, single-use, and expire in 15 minutes, which makes remote brute force impractical but not impossible. Add rate limiting before launch.
- **Approve/reject endpoints aren't built yet.** The pending queue fills up correctly, but the admin-side actions to clear it are part of the admin API, not this branch.
- **No automated tests.** The flows here were verified by hand against the real database.
- **`AllowAnyOrigin` CORS.** Fine for development, needs narrowing before deployment.
