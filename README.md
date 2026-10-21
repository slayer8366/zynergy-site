# zynergy-labs.com

Static site on Cloudflare Pages (project `zynergy-site`), plus two Pages Functions for the
Forager beta list. The sign-up is closed now that Forager is on Google Play (owner, 2026-10-21):
`/beta-signup/` redirects to the Play listing and the sign-up API answers 410. The owner deleted
the collected list (the `beta_signups` and `beta_rate_limit` rows) on <DATE>, in the Cloudflare
dashboard; the tables and the export endpoint remain, so the export now returns an empty list.

```
index.html                  holding page for the business splash, and what every
                              unmatched path on the site resolves to
beta-signup/index.html      the old beta signup page, kept in the repo but no longer served:
                              _redirects sends /beta-signup/ to Google Play
welcome/index.html          what testers see once they are in: things to try, known issues
privacy/index.html          Forager privacy policy, the URL Play's Data safety points at
assets/                     app icon and feature graphic
functions/_middleware.js    blocks /functions/* and /db/*, sets the shared response headers
functions/api/beta-signup.js  POST: closed, answers 410 Gone and stores nothing
functions/api/beta-export.js  GET:  the list as CSV, behind a bearer token
db/schema.sql               D1 schema for the `zynergy-site-beta` database
Forager/forecast/           Pacific Northwest pilot demo: index.html, app.js, data/ (static map tiles
                              data/<layer>/{z}/{x}/{y}.png, zooms 5 to 9, and lines.geojson),
                              vendor/ (MapLibre GL JS 6.13.0, self-hosted because the CSP
                              allows scripts from 'self' only; basemap/, the street map's
                              style code, fonts and icons; SHA256SUMS.txt)
_redirects                  lowercase /forager/forecast to /Forager/forecast/; /beta-signup
                              to the Google Play listing (302)
_routes.json                keeps the Function off /Forager/forecast/data/*
_headers                    cache headers for /Forager/forecast/data/*
```

## Where the pages live

| URL | What it is |
|-----|------------|
| `/` | Holding page. Becomes the business splash. |
| `/beta-signup`, `/beta-signup/` | 302 to the Forager Google Play listing, from `_redirects` (owner, 2026-10-21). 302 rather than 301 so browsers do not cache it for good, in case a page returns here. The form's page stays in the repo, unserved. |
| `/welcome/` | Tester greeting, `noindex`, for people already in the test. |
| `/privacy/` | Forager privacy policy. |
| `/forager` | Intended for the app page. Does not exist yet. |
| `/Forager/forecast/` | Pacific Northwest pilot demo: the Sighting chance (pilot) layer for chanterelles and the model inputs (soil pH, host trees), over our own street map, as a browsable map. Opens on soil pH. The finished forecast will live at `/Forager/mushroom-forecast/`. Built from `slayer8366/forager-forecast` (Forager RECORD -772 to -777, -857 to -860). |
| `/forager/forecast`, `/forager/forecast/` | 301 to `/Forager/forecast/`, from `_redirects` (owner, RECORD -776). Scoped to those two paths: `/forager` itself is unchanged. |

The API paths (`/api/beta-signup`, `/api/beta-export`) are fixed and independent of where the
form is served from, so moving a page never breaks a submission.

Cloudflare serves the root `index.html` for **every unmatched path**, with status 200 rather
than 404. So `/anything/made/up` shows the holding page and looks like a hit. Two consequences:
whatever sits at `/` is also the site's de facto not-found page, and any check against this
site has to read the body or a header, never the status alone. A real 404 would need a
`404.html`; it is a deliberate open item, not an oversight.

## How a signup travelled (closed since 2026-10-21)

`POST /api/beta-signup` now answers **410 Gone** with
`{"ok":false,"error":"signup_closed","message":...,"play_url":...}` and touches nothing: no row,
no rate-limit entry, no mail. A copy of the old form still open in a browser shows its generic
fallback on submit ("That did not go through (error 410)..."). The handler described below is in
git history at df15222.

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

> **Since the sign-up closed (2026-10-21)** only `EXPORT_TOKEN` is read by any code.
> `RESEND_API_KEY`, `RATE_LIMIT_SALT` and `TURNSTILE_SECRET` were read only by the sign-up
> handler, which is now in git history at df15222. Whatever is set in the dashboard was left
> untouched; the table below describes that handler.

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
has been fixed since earlier builds. It is `noindex` and is not linked from the signup page or the holding
page, because it is
for people who are already in the test, not people deciding whether to join. Paste the URL
into the Play closed-test instructions, or into the invite mail.

The wording is the owner's, kept verbatim; the page only adds structure. Both known issues
were checked against the app before publishing: soil temperature is a hardcoded `°C` at
`AvailabilityResultsUi.kt:585` and elevation a hardcoded `m` at `AvailabilityScreen.kt:4322`,
with `UnitSystem.kt` naming both as the conversions still queued, and no import path exists.

Both were fixed in the app later, and the page now lists them under "Fixed since earlier builds"
(owner, 2026-10-21: "Yes, fix them"). Checked against Forager main `381515c61`: elevation and
soil temperature go through `formatWholeLength` and `formatSoilTemperature`
(`domain/model/UnitSystem.kt:82`, `:105`), called with the Units setting at, for example,
`AvailabilityMapControlsUi.kt:343` and `AvailabilityTripWindowsUi.kt:124`; Settings has a Backup
section with "Back up now" and "Restore from backup" (`ui/backup/BackupSection.kt:93`, `:146`),
placed in Settings at `AvailabilitySettingsPages.kt:197`. The heading also no longer says "first
closed beta".

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
`beta-signup.js` was the only function that knew which provider it is (removed with the
sign-up's closing; git history at df15222).

**D1 rather than KV.** The list gets queried, not just looked up: dedupe on a normalised
address, order by date, count, export. KV is a key-value store for flat values and would
make each of those a scan. This follows the same line drawn in the Forager app between Room
and DataStore.

**No IP addresses are stored.** Rate limiting needs to recognise a repeat caller, not
identify one, so `beta_rate_limit` keys on a salted SHA-256 of the IP. Country is kept,
because it is coarse and "where is the interest coming from" is worth being able to answer.
The failed-notification log line deliberately omits the address too. Which signup failed is
answerable from the export, and a request log is the wrong place to accumulate addresses.

**The pilot demo's input layers are static tiles.** Each layer is a folder of 256-pixel PNG tiles,
`Forager/forecast/data/<layer>/{z}/{x}/{y}.png`, zooms 5 to 9, about 570 a layer and 2,280 in
all (Pages allows 20,000 files a deployment and 25 MiB a file). Each pixel carries the layer's
value as a grey byte with an alpha byte for no data, and `app.js` colours it and reads the tapped
pixel from the same tile. Every tile inside the layer's bounds exists, even an empty one, because
a missing path here returns the home page with status 200. `_routes.json` keeps the Function off
these paths, so a tile is a plain static file; `_headers` gives them a one-hour cache. The owner
chose this over PMTiles archives (Forager RECORD -786, "A: Pre-cut tiles, go live"): an archive
needs HTTP Range requests, which the asset server behind this site's Function did not answer.
The tiles are the output of forager-forecast's `scripts/pnw_build.py xyz`, run per layer, copied
into `Forager/forecast/data/`. The first cut (2026-10-09) read the PNW mosaic of 05:39 PDT that day,
with Canada's cells as grey 255 ("pending"). Since Forager RECORD -839 they read the completed
mosaic (Canada filled from SCANFI v2; the drive keeps the old one as
`forecast-data/pnw/mosaic-2026-10-09/`): the same stage on the old mosaic reproduces the first cut
byte for byte, and on the new one changes 72 tiles (24 each in tree cover, Douglas-fir and hemlock)
and only pixels that were grey 255. Hemlock is blank (alpha 0) in Canada, because SCANFI does not
separate it (forager-forecast D85); the legend and the tap readout say so.

**The pilot demo's street map is ours** (Forager RECORD -857 to -860): vector tiles from our
own tile server (`forager-pmtiles` Worker, `/us/{z}/{x}/{y}.mvt`), styled at load by the vendored
`@protomaps/basemaps` 5.7.2 build (light flavour), with all four Noto Sans faces the style uses
(Regular, Medium, Italic and Devanagari Regular; 1,024 glyph files, about 11.5 MB) and the light icon sheet under `Forager/forecast/vendor/basemap/`, their
BSD-3, OFL and MIT notices beside them and checksums in `vendor/SHA256SUMS.txt`. Nothing else is
fetched from outside the site. The coloured layers sit above it, the borders and the street map's
town names above them; the see-through slider sets the layers' opacity (70% at load, not
stored), and the legend is drawn as the colours look over the street map's land colour. Panning
stops at 49.6 N, where the tile server's coverage ends. The tile server is another origin, so
`functions/_middleware.js` adds it to `connect-src` for `/Forager/forecast/` paths only; every
other page keeps `connect-src 'self'`. Serving live browsing from the tile server depends on its
account being on the paid plan (RECORD -860, lifting the 2026-08-22 rule that it serve offline
downloads only): the free plan's 100,000 requests a day fail hard beyond the cap (Forager
docs/plans/2026-10-03-own-tiles-survey.md:58, from the host's published pages on 2026-10-03).

**The pilot demo's "Sighting chance (pilot)" layer is two plain files**, not tiles
(Forager RECORD -814): `Forager/forecast/data/pnw-pilot/current/manifest.json` and
`Forager/forecast/data/pnw-pilot/current/cantharellus.geojson`, in the shape forager-forecast
D55/D56 fixes (one 0.1 degree weather cell per feature), drawn and read by `pilot.js`. About
3,000 cells is about 1.4 MB uncompressed, small enough for one file; the per-block files the
scoring step also writes are for the app and are not copied here. The scoring step writes a
week folder, `pnw-pilot/<week>/`; its two files are copied into `current/` so the page never
needs to know the week, and the week it shows comes from the manifest. The banner over the
map is built from the manifest alone and says "not stated" for a missing field rather than
assuming one. On a screen 760 px wide or less the banner is one line (for example "Pilot model. Not
validated. Reviewed. Week of ...") that expands on a tap, with the calendar line first in the expansion. The
attribution string D55 asks for "on the map" is in MapLibre's attribution control, which starts
collapsed to its (i) button on every width (on narrow maps first; on wide ones too since Forager
RECORD -895): one tap away on the map, so it does not cover the map before the first pan. The
banner credits the sources in one short line built from the manifest's `attribution_sources`
("Data: GBIF sighting records; Copernicus climate data. Details", RECORD -895), with every
citation and notice in full under Details; a source key the page has no short name for brings
back the manifest's full attribution string instead. Both follow the owner's rule that nothing fully obstructs the map. The page fetches both files with `cache: 'no-cache'`, so a new week is not
hidden behind `_headers`' hour-long cache. The files in `current/` today are the scoring step's weather-model output for the week of
5 October 2026, 2026-W41 (forager-forecast `pnw-pilot-scoring` 9090a59, republished at 949a5cf with the
weather line of Forager RECORD -893 and -895 and the base_rate of -901: 2,618 of 3,116 cells scored; combined
file sha256 ac6038d3..., manifest 074879ff...; credited to the GBIF download and the Copernicus products read). It replaced
the calendar-only output (9e24e67: 2,387 cells, no weather read; c74ee7f0..., 4debbc8b...). With a `base_rate` in the manifest
(the share of tested cell-weeks with a report, -901), cells are coloured and the readout leads with one of five
ratings by chance ÷ base rate, cut-offs fixed by the owner (RECORD -902): Below average under 0.67, About average
to 1.5, Above average to 3, High to 5, Very high from 5; the legend adds "Average week across the year". Without
one, the percent classes and readout stand as before. To drop in a week (from the root of this repo):

```bash
W=<path to the scoring output>/pnw-pilot/<week>
cp "$W/manifest.json" "$W/cantharellus.geojson" Forager/forecast/data/pnw-pilot/current/
```

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
