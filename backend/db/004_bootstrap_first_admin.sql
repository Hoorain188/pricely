-- 004_bootstrap_first_admin.sql
--
-- Chicken-and-egg: approving a back-office request requires an existing
-- admin, so the very first one cannot be created through the API. It is
-- promoted here instead, which means creating an admin from scratch needs
-- direct database access — the right bar for that power.
--
-- HOW TO USE
--   1. Sign up normally in the app through the ADMIN tab.
--   2. Enter the emailed code. You'll be told the request is pending.
--   3. Put your email below and run this file once.
--   4. Log in — you're now an active admin and can approve everyone else.
--
-- Only needed once, ever. After this, use the app's approve/reject screen.

\set admin_email 'CHANGE_ME@example.com'

UPDATE users
SET role = 'admin',
    is_active = TRUE,
    email_verified_at = COALESCE(email_verified_at, now()),
    updated_at = now()
WHERE email = :'admin_email';

UPDATE team_requests
SET status = 'approved',
    reviewed_at = now()
WHERE email = :'admin_email'
  AND status = 'pending';

-- Confirm it worked — expect one row, role=admin, is_active=t.
SELECT id, email, role, is_active, (email_verified_at IS NOT NULL) AS verified
FROM users
WHERE email = :'admin_email';
