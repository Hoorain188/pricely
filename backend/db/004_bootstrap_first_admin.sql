-- 004_bootstrap_first_admin.sql
--
-- Chicken-and-egg: approving a back-office request requires an existing
-- admin, so the very first one cannot be created through the API. It is
-- promoted here instead, which means making an admin from scratch needs
-- direct database access — the right bar for that power.
--
-- Plain SQL only: no \set or :'variables', because those are psql commands
-- and pgAdmin's Query Tool does not understand them.
--
--
-- HOW TO USE
--   1. Sign up in the app through the ADMIN tab with your real email.
--   2. Enter the emailed code. You'll be told the request is pending.
--   3. Replace BOTH copies of 'CHANGE_ME@example.com' below with that email.
--   4. Select all and run (the ⚡ / F5 button in pgAdmin).
--   5. Check the last result: role should be admin, is_active should be true.
--   6. Log in — you can now approve everyone else from the app.
--
-- Only needed once, ever. After this, use the app's approve/reject screen.


-- Step 1 of 2 — make the account an active admin.
UPDATE users
SET role              = 'admin',
    is_active         = TRUE,
    email_verified_at = COALESCE(email_verified_at, now()),
    updated_at        = now()
WHERE email = 'CHANGE_ME@example.com';


-- Step 2 of 2 — close their pending request so it stops showing in the queue.
UPDATE team_requests
SET status      = 'approved',
    reviewed_at = now()
WHERE email = 'CHANGE_ME@example.com'
  AND status = 'pending';


-- Check it worked. Expect exactly one row: role = admin, is_active = t.
-- If you get zero rows, the email doesn't match any account — check step 1
-- actually completed and that the spelling is identical.
SELECT id, email, role, is_active, (email_verified_at IS NOT NULL) AS verified
FROM users
WHERE email = 'CHANGE_ME@example.com';
