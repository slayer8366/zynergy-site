# zynergy-labs.com

Static site on Cloudflare Pages (project `zynergy-site`), plus two Pages Functions that
run the Forager beta list.

```
index.html                  the beta signup page
privacy/index.html          Forager privacy policy — the URL Play's Data safety points at
assets/                     app icon and feature graphic
functions/_middleware.js    blocks /functions/* and /db/*, sets the shared response headers
functions/api/beta-signup.js  POST — records a signup, notifies support@
functions/api/beta-export.js  GET  — the list as CSV, behind a bearer token
db/schema.sql               D1 schema for the `zynergy-beta` database
```

## How a signup travels

1. The form on `/` POSTs JSON to `/api/beta-signup`.
2. The function validates, checks the honeypot, optionally checks Turnstile, and applies a
   per-caller rate limit of 5 signups an hour.
3. **The row is written to D1 first.** Only then is the notification mailed to
   support@zynergy-labs.com.
4. Whether that mail succeeded is written back onto the row as `notified_at` or
   `notify_error`, and both appear in the CSV export.

The order matters. A mail provider that is down, rate limiting, or misconfigured then costs
a notification rather than a signup, and the export says exactly which rows never reached
support@ instead of leaving it to be guessed. The page tells the person they are on the
list because at that point they are, and nothing tells them a mail was sent when it was not.

## What still needs doing in the Cloudflare dashboard

None of this can be set from the repository. Until steps 1 and 2 are done the endpoint
returns `503 signup_unavailable` and the page says the list is unreachable, which is true.

**1. Bind the database.** Workers &amp; Pages → `zynergy-site` → Settings → Bindings, for
**both** Production and Preview:

| Variable name | D1 database  | Database ID                            |
|---------------|--------------|----------------------------------------|
| `BETA_DB`     | `zynergy-beta` | `71c395fc-66ea-421b-ab7c-5cbbba398ec9` |

The database is created and the schema is already applied. To reapply or to check it:

```bash
wrangler d1 execute zynergy-beta --remote --file=db/schema.sql
wrangler d1 execute zynergy-beta --remote --command "SELECT count(*) FROM beta_signups"
```

**2. Set the secrets**, same Settings page, as encrypted environment variables:

| Name              | Required | What it is |
|-------------------|----------|------------|
| `RESEND_API_KEY`  | to mail  | Resend API key. Without it a signup is still recorded, and the row gets `notify_error = mailer_not_configured`. |
| `EXPORT_TOKEN`    | to export | Any long random string. Without it `/api/beta-export` returns 503 rather than serving the list. |
| `RATE_LIMIT_SALT` | no       | Random string. Salts the hashed caller IP. Without it a built-in constant salt is used and a warning is logged. |
| `TURNSTILE_SECRET`| no       | See the warning below before setting this. |

Generate the export token with `openssl rand -base64 32`.

**3. Set up sending.** The notification needs a From address on a domain Resend has
verified. Use a **subdomain**, `mail.zynergy-labs.com`, not the root:

zynergy-labs.com's mail is Microsoft 365 (`MX → zynergylabs-com01i.mail.protection.outlook.com`)
and its SPF record is `v=spf1 include:secureserver.net -all`. That `-all` is a hard fail, so
mail sent from the root domain through anyone but GoDaddy's servers is asked to be rejected.
Adding Resend's include to it would work but edits the record that Microsoft 365 delivery
depends on. A separate subdomain gets its own SPF and DKIM and leaves the root untouched.

Add the records Resend gives you to the zynergy-labs.com zone — the zone is on Cloudflare DNS
(`denver`/`nicole.ns.cloudflare.com`), so they go in the same dashboard. Then set
`BETA_NOTIFY_FROM` if it should differ from the default
`Forager Beta <beta@mail.zynergy-labs.com>`, and `BETA_NOTIFY_TO` if it should go somewhere
other than support@zynergy-labs.com.

**4. Optional: Turnstile.** ⚠️ Setting `TURNSTILE_SECRET` **without** also adding the widget
to `index.html` rejects every real submission, because a submission arriving with no token
fails the check. The widget markup is sitting commented out in `index.html` next to the
honeypot, with the site key to fill in. Add both together or neither.

## Getting the list back out

```bash
curl -H "authorization: Bearer $EXPORT_TOKEN" https://zynergy-labs.com/api/beta-export
curl -H "authorization: Bearer $EXPORT_TOKEN" 'https://zynergy-labs.com/api/beta-export?format=json'
```

This is the reason the database exists rather than the mail alone. Notifications get lost —
an outage, a spam filter, a forwarding rule that was never quite right — and the list should
not be recoverable only from an inbox.

## Decisions, and what was rejected

**Cloudflare Email Routing's `send_email` binding — cannot be used here.** It is the option
with no third party involved, and it does not apply: it requires Email Routing to be enabled
on the zone, which requires Cloudflare to hold the MX records. zynergy-labs.com's MX points
at Microsoft 365. Sending therefore needs an outside API, and Resend was picked for a free
tier that covers a beta list and an API small enough to swap out — `sendNotification()` in
`beta-signup.js` is the only function that knows which provider it is.

**D1 rather than KV.** The list gets queried, not just looked up: dedupe on a normalised
address, order by date, count, export. KV is a key-value store for flat values and would
make each of those a scan. This follows the same line drawn in the Forager app between Room
and DataStore.

**No IP addresses are stored.** Rate limiting needs to recognise a repeat caller, not
identify one, so `beta_rate_limit` keys on a salted SHA-256 of the IP. Country is kept,
because it is coarse and "where is the interest coming from" is worth being able to answer.
The failed-notification log line deliberately omits the address too — which signup failed is
answerable from the export, and a request log is the wrong place to accumulate addresses.

**`functions/_middleware.js` blocks `/functions/*` and `/db/*`.** Pages publishes the build
output directory, which for this project is the repository root. Whether the functions
directory is also uploaded as static files depends on how Pages treats a given project, and
locally it was: `GET /functions/api/beta-signup.js` returned the source as
`application/javascript`. Blocking the paths does not depend on knowing the answer. The
tidier fix is to move the site into `public/` and point the project's build output directory
at it, which needs a dashboard change and would break the live site if the two ever
disagreed, so it is not done here.

## Running it locally

```bash
npm install wrangler@4
wrangler d1 execute zynergy-beta --local --file=db/schema.sql
wrangler pages dev
```

`wrangler pages dev` needs a `wrangler.toml` supplying the bindings that production gets from
the dashboard; it is deliberately not committed, because adding one to the repository changes
how Pages builds this project.

```toml
name = "zynergy-site-local"
pages_build_output_dir = "."
compatibility_date = "2026-09-01"

[[d1_databases]]
binding = "BETA_DB"
database_name = "zynergy-beta"
database_id = "71c395fc-66ea-421b-ab7c-5cbbba398ec9"

[vars]
EXPORT_TOKEN = "local-test-token"
```
