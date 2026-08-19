# Pricely — where things stand

Paste this into a new chat to bring someone (or a fresh Claude session) up to speed.

---

## The product

**Pricely** (also "PriceCompare PK") — a price-comparison app for Pakistan. Scrapers pull listings from Daraz, Telemart, Mega.pk, PriceOye, Shophive and Amazon. The same physical product appears under different titles on each store, so a matching step groups them, with an admin review queue for low-confidence matches. Shoppers then see **one product with several store prices**, and can favourite items and set price alerts.

One Expo / React Native app serves **both** shoppers and staff, split by role after login — not a separate admin website. (The original written plan said a separate .NET/Blazor admin site; the team decided everything should be React-based.)

**Repo:** `github.com/AbdulSamadsatti/Pricely` (public)
**Team of 3:** Hoorain (me/user), Abdul Samad, Noor Fatima. All learning backend; nobody is a .NET expert.

---

## Layout

```
Pricely.pk/                      Expo app (React Navigation, NOT Expo Router)
  frontend.apk/
    app/                         screens
    context/                     AuthContext (zustand) etc.
    services/authService.ts      calls the API
    config/api.ts                resolves the API base URL
  .env                           EXPO_PUBLIC_API_URL (gitignored, machine-specific)

backend/                         ASP.NET Core 10, three projects
  Pricely.Api/                   controllers, auth services, Program.cs
  Pricely.Core/                  Entities.cs, Enum.cs, DTOs
  Pricely.Infrastructure/        AppDbContext (all 18 tables)
  db/                            numbered SQL migrations
  MERGE-PLAN.md                  Noor's merge analysis

Pricely.pk/PriceCompare.Api/     older duplicate backend copy — see security note
```

**Database:** Neon Postgres, 18 tables, created by hand in SQL. **The database is the source of truth**; entity classes are written to match it. Migrations live in `backend/db/` (`001`…`004`), applied in order.

---

## What exists and works

**Auth (built this session, tested against the live database)**
signup → emailed 6-digit code → verify → login; forgot/reset password; resend code; refresh tokens with rotation; logout; session list.

**Team management**
Pending-approval queue (approve/reject), invites (hashed token, single-use, 7-day expiry, real email), role changes, member removal, activity log.

**Admin API (Noor's, pre-existing)**
Dashboard, duplicates review, customers, reports, scrapers, settings.

**Security actually enforced**
- Passwords and codes BCrypt-hashed; refresh tokens 64 random bytes stored as SHA-256, rotated each use.
- `portal` in the login body says **which tab was pressed**, never what access is granted. The role is read from the database row. A tampered client sending `"portal":"admin"` gets nowhere.
- Every `/api/v1/admin/**` endpoint **re-reads the user row** rather than trusting the token's role, so demoting or removing someone takes effect immediately instead of when their token expires.
- Wrong password and wrong-tab return an identical message, so the endpoint can't be used to discover which emails are admins. Same reason forgot-password always reports success.
- Rate limiting per IP: 10 per 5 min on login/code entry, 5 per 15 min on anything that emails.
- Verification codes lock after 5 wrong guesses.
- Cannot approve your own request, demote yourself, or remove yourself.
- Changing a password or role revokes every existing session.

Verified by attack: tampered tokens, tokens signed with another key, `alg=none`, SQL injection in the email field, and cross-user session access are all rejected. No response contains a password or hash.

---

## Git state

- Everything is on branch **`feature/backend-auth`**, fully pushed.
- **Not merged into `main` yet.** A PR is open. The branch already merges `origin/main` into itself, so the PR should be conflict-free.
- `main` is at `85a8ceb`.

---

## Running it — three terminals

```bash
cd backend/Pricely.Api && dotnet run                       # API on 0.0.0.0:5099
~/bin/cloudflared tunnel --url http://localhost:5099       # public URL
cd Pricely.pk && npx expo start -c                         # the app
```

**Admin login:** `hfhoorain18@gmail.com` / `Pricely@Admin-2026!` / **ADMIN** tab.
This is the **only** account that can log in — every other row has a placeholder password hash. The password was set through the reset flow and should be changed.

**Secrets** live in `dotnet user-secrets` (outside the repo): `ConnectionStrings:Default`, `Jwt:SigningKey`, `Email:FromAddress`, `Email:SmtpPassword` (a Gmail App Password, entered without spaces).

---

## Environment quirks that cost hours — don't rediscover them

1. **.NET 10 is installed in `~/.dotnet`**, not system-wide (that needs root). `~/.zshrc` puts it ahead of the system .NET 8. **Open a new terminal** after any change, or `dotnet run` fails with *"The current .NET SDK does not support targeting .NET 10.0"*.
2. **The router blocks device-to-device traffic.** The phone cannot reach the laptop's LAN IP even on the same WiFi. Hence the Cloudflare tunnel. **The tunnel URL changes on every restart** — update the one line in `Pricely.pk/.env` and restart Expo with `-c`.
3. **`expo-secure-store` is native-only.** Sessions don't persist in a browser. Harmless for the APK; confusing when testing on web.
4. **`git fetch` on this machine often fails** with `RPC failed; curl 92 HTTP/2`. `http.version` is set to HTTP/1.1 to help. Pushes work fine.
5. **macOS is case-insensitive.** `ActivityLogger.cs` and `Activitylogger.cs` are the same file — this silently ate a file once.
6. **Neon suspends when idle**; the first request after a pause takes several seconds. Retry-on-failure is configured.

---

## ⚠️ Open security issue — not yet fixed

A **live Neon database password is public in git history**:

```
Pricely.pk/PriceCompare.Api/appsettings.json
Pricely.pk/PriceCompare.Api/appsettings.Development.json
```

Password `npg_YadtLZc8G1oV`, host `ep-twilight-haze-azeqbl5l...` — a **different** database from the main one, so a teammate set it up. Committed `bin/` output held copies too.

The files were blanked and `bin/`/`obj/` untracked, **but that does not un-expose it** — it is in history on a public repo. **Whoever owns that database must rotate the password in Neon.**

---

## What to tell Noor

Two `TeamController`s existed. Hers had, verbatim:

```
// TODO: [Authorize(Roles = "Admin")] on every write action here.
```

...and no attributes — so **approving yourself as admin required no token at all**. It also had no self-approval / self-demotion / last-admin guards, its approve only marked the row reviewed without activating the account or setting a role, and it stored the **raw** invite token with the email left as a TODO.

Resolution: **kept her routes and response shapes** (`/api/v1/admin/team`, `TeamResponse`, `TeamMemberDto`), because the Manage Team Access screens already call them — but put the auth implementation behind them. Her controller logic is now unused and she should review that nothing she wanted was dropped.

Three fields were added to `Pricely.Core/Entities.cs` that her side hadn't mapped: `VerificationCode.Attempts` (the lockout), `TeamRequest.ExpiresAt` (invite expiry), and the `User.Sessions` / `Session.User` / `TeamRequest.User` navigations that session revocation and approval depend on.

---

## Next steps, roughly in order

1. **Merge the PR** into `main` (open, should be clean).
2. **Rotate that leaked Neon password.**
3. **Deploy the API** (Render / Railway / Fly) — removes the tunnel, the three terminals, and the changing URL.
4. **Wire the remaining admin screens** to the API. Team management screens still read from mock contexts (`TeamContext`, `AccountsContext`) in places.
5. **Scrapers and product matching** — the actual product, not started.
6. **Shopper API** — search, product detail with store offers, favourites, alerts.
7. Later: Google sign-in (free; Apple needs the $99/yr developer account and is only required if shipping to the App Store).

---

## Known gaps, stated plainly

- **No automated tests.** Everything was verified by hand and by driving the UI. That is not a substitute for tests that run on every change.
- Two admins demoting each other at the same instant could leave zero admins. The self-guards stop the realistic case; the race needs serialisable isolation or a row lock.
- `AllowAnyOrigin` CORS — fine for development, narrow it before launch.
- Rate limiting is per-IP and in-memory: one office NAT shares a budget, and counts reset when the API restarts.
- Removed members are deactivated, not deleted, so `activity_log` keeps working. No hard-delete path exists yet.
- `Pricely.pk/PriceCompare.Api/` looks like an abandoned duplicate of the backend. Worth confirming with the team and deleting.
