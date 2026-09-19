# zynergy-labs.com

Static site on Cloudflare Pages (project `zynergy-site`), plus two Pages Functions that
run the Forager beta list.

```
index.html                  holding page for the business splash, and what every
                              unmatched path on the site resolves to
beta-signup/index.html      the beta signup page
welcome/index.html          what testers see once they are in: things to try, known issues
privacy/index.html          Forager privacy policy, the URL Play's Data safety points at
Forager/mushroom-forecast/  planning record for the mushroom fruiting forecast: spec,
                              decisions, tasks, dispatches, evidence. Start at its
                              docs/planning/START_HERE.md
assets/                     app icon and feature graphic
functions/_middleware.js    blocks /functions/* and /db/*, sets the shared response headers
functions/api/beta-signup.js  POST: records a signup, notifies support@
functions/api/beta-export.js  GET:  the list as CSV, behind a bearer token
db/schema.sql               D1 schema for the `zynergy-site-beta` database
```

## Where the pages live

| URL | What it is |
|-----|------------|
| `/` | Holding page. Becomes the business splash. |
| `/beta-signup/` | The signup form. |
| `/welcome/` | Tester greeting, `noindex`, for people already in the test. |
| `/privacy/` | Forager privacy policy. |
| `/forager` | Intended for the app page. Does not exist yet. |
| `/Forager/mushroom-forecast/` | Planning record for the mushroom fruiting forecast, served as plain files. Start at `docs/planning/START_HERE.md` under it. |

The API paths (`/api/beta-signup`, `/api/beta-export`) are fixed and independent of where the
form is served from, so moving a page never breaks a submission.

Cloudflare serves the root `index.html` for **every unmatched path**, with status 200 rather
than 404. So `/anything/made/up` shows the holding page and looks like a hit. Two consequences:
whatever sits at `/` is also the site's de facto not-found page, and any check against this
site has to read the body or a header, never the status alone. A real 404 would need a
`404.html`; it is a deliberate open item, not an oversight.

## How a signup travels

1. The form at `/beta-signup/` POSTs JSON to `/api/beta-signup`.
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

## The database

`BETA_DB` → **`zynergy-site-beta`**, UUID **`9cb6b148-62d3-402e-8527-5ddab4c0c1be`**, in
Cloudflare account `aac482d6710c493a811ce9335792f145`. Bound on both Production and Preview,
and confirmed working at runtime: a preview deployment accepted a POST, wrote the row,
derived the country server-side, and honoured the `email_norm` UNIQUE constraint.

Identify it by UUID, not by name. Two accounts are in play for this project, and D1's list
endpoint reports `num_tables: 0` for databases that are in fact populated, so its failure mode
reads as "empty database". Use the detail endpoint or query `sqlite_master` instead.

> **A second database exists and is not the one bound.** `zynergy-beta`,
> `71c395fc-66ea-421b-ab7c-5cbbba398ec9`, was created in the *other* account
> (`a6a899e01e2194ef8fff048c20130e14`, the one holding the `forager-pmtiles` Worker) before
> the binding above was made, and this README named it until now. It is an orphan: nothing
> points at it. As of 2026-09-11 a query against that UUID from that account returns
> `7404 could not be found`, which suggests it has already been deleted, though that was not
> confirmed by watching it happen. If it does still exist, delete it. A schema version, a
> port, a database ID: any globally-unique claim made twice merges without conflict and
> still produces a broken result.

To reapply or check the schema, against the bound database:

```bash
wrangler d1 execute zynergy-site-beta --remote --file=db/schema.sql
wrangler d1 execute zynergy-site-beta --remote --command "SELECT count(*) FROM beta_signups"
```

## What still needs doing in the Cloudflare dashboard

The binding above is done. The secrets are not, deliberately: a signup records without them,
the row carries `notified: false` and `notify_error: "mailer_not_configured"`, and
`/api/beta-export` returns 503 until `EXPORT_TOKEN` exists rather than serving the list.

**Set the secrets** on Workers &amp; Pages → `zynergy-site` → Settings, as encrypted
environment variables:

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

Add the records Resend gives you to the zynergy-labs.com zone. The zone is on Cloudflare DNS
(`denver`/`nicole.ns.cloudflare.com`), so they go in the same dashboard. Then set
`BETA_NOTIFY_FROM` if it should differ from the default
`Forager Beta <beta@mail.zynergy-labs.com>`, and `BETA_NOTIFY_TO` if it should go somewhere
other than support@zynergy-labs.com.

**4. Optional: Turnstile.** ⚠️ Setting `TURNSTILE_SECRET` **without** also adding the widget
to `index.html` rejects every real submission, because a submission arriving with no token
fails the check. The widget markup is sitting commented out in `index.html` next to the
honeypot, with the site key to fill in. Add both together or neither.

## The tester welcome page

`https://zynergy-labs.com/welcome/` carries the greeting: what to try in this build and what
is known to be broken. It is `noindex` and is not linked from the signup page or the holding
page, because it is
for people who are already in the test, not people deciding whether to join. Paste the URL
into the Play closed-test instructions, or into the invite mail.

The wording is the owner's, kept verbatim; the page only adds structure. Both known issues
were checked against the app before publishing: soil temperature is a hardcoded `°C` at
`AvailabilityResultsUi.kt:585` and elevation a hardcoded `m` at `AvailabilityScreen.kt:4322`,
with `UnitSystem.kt` naming both as the conversions still queued, and no import path exists.

## Getting the list back out

```bash
curl -H "authorization: Bearer $EXPORT_TOKEN" https://zynergy-labs.com/api/beta-export
curl -H "authorization: Bearer $EXPORT_TOKEN" 'https://zynergy-labs.com/api/beta-export?format=json'
```

This is the reason the database exists rather than the mail alone. Notifications get lost, whether to
an outage, a spam filter, or a forwarding rule that was never quite right, and the list should
not be recoverable only from an inbox.

## Decisions, and what was rejected

**Cloudflare Email Routing's `send_email` binding cannot be used here.** It is the option
with no third party involved, and it does not apply: it requires Email Routing to be enabled
on the zone, which requires Cloudflare to hold the MX records. zynergy-labs.com's MX points
at Microsoft 365. Sending therefore needs an outside API, and Resend was picked for a free
tier that covers a beta list and an API small enough to swap out. `sendNotification()` in
`beta-signup.js` is the only function that knows which provider it is.

**D1 rather than KV.** The list gets queried, not just looked up: dedupe on a normalised
address, order by date, count, export. KV is a key-value store for flat values and would
make each of those a scan. This follows the same line drawn in the Forager app between Room
and DataStore.

**No IP addresses are stored.** Rate limiting needs to recognise a repeat caller, not
identify one, so `beta_rate_limit` keys on a salted SHA-256 of the IP. Country is kept,
because it is coarse and "where is the interest coming from" is worth being able to answer.
The failed-notification log line deliberately omits the address too. Which signup failed is
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
wrangler d1 execute zynergy-site-beta --local --file=db/schema.sql
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
database_name = "zynergy-site-beta"
database_id = "9cb6b148-62d3-402e-8527-5ddab4c0c1be"

[vars]
EXPORT_TOKEN = "local-test-token"
```
