-- Schema for the Forager beta list (Cloudflare D1, database `zynergy-beta`).
--
-- Apply with:
--   wrangler d1 execute zynergy-beta --remote --file=db/schema.sql
--
-- Design notes, so the reasoning survives the commit:
--
--  * The store is authoritative, the email is a notification. A signup is written
--    here first and the support@ mail is sent afterwards; a mail provider outage
--    therefore costs a notification, not a signup. `notified_at` / `notify_error`
--    record which of the two happened, so a failed send is visible in the export
--    rather than swallowed.
--
--  * `email_norm` (trimmed, lower-cased) carries the UNIQUE constraint rather than
--    `email`, so `Sam@Example.com` and `sam@example.com` are one person. The
--    address is also kept verbatim in `email` because that is what the person
--    typed and what should be mailed.
--
--  * No IP address is stored. Rate limiting needs to recognise a repeat caller,
--    not identify one, so `beta_rate_limit` keys on a salted SHA-256 of the IP
--    and the rows are prunable. Country is kept coarse (Cloudflare's two-letter
--    `cf.country`) because "which countries is the beta interest coming from" is
--    a question worth answering and a country is not a location.

CREATE TABLE IF NOT EXISTS beta_signups (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL,
  email_norm      TEXT NOT NULL UNIQUE,
  name            TEXT,
  device          TEXT,
  android_version TEXT,
  note            TEXT,
  country         TEXT,
  source          TEXT NOT NULL DEFAULT 'web',
  created_at      TEXT NOT NULL,
  notified_at     TEXT,
  notify_error    TEXT
);

CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at ON beta_signups (created_at);
CREATE INDEX IF NOT EXISTS idx_beta_signups_notified   ON beta_signups (notified_at);

CREATE TABLE IF NOT EXISTS beta_rate_limit (
  ip_hash    TEXT PRIMARY KEY,
  hits       INTEGER NOT NULL,
  window_start TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beta_rate_limit_window ON beta_rate_limit (window_start);
