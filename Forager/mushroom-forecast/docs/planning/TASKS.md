# Tasks

As of 2026-09-18. Ordered by dependency, then by risk. T1 can overturn the whole plan for the price of a
notebook, so it runs before any pipeline work. Dispatch files exist for T0 to T3. The rest firm up once
T1 reports.

| Task | Status | Dispatch |
| --- | --- | --- |
| T0. Repo bootstrap | Not started | docs/dispatch/2026-09-18-t0-repo-bootstrap.md |
| T1. Calendar smoke test | Not started | docs/dispatch/2026-09-18-t1-calendar-smoke-test.md |
| T2. Record audit | Not started | docs/dispatch/2026-09-18-t2-record-audit.md |
| T3. Verify from-memory layers | Not started | docs/dispatch/2026-09-18-t3-verify-data-layers.md |
| T4 to T11 | Not started | Not written yet |

**T0. Repo bootstrap**
- Depends on: none
- Does: report the repo's state and conventions, commit this pack to match them, propose a minimal project layout. Builds nothing else.
- Verify: commit hash, tree listing, a conventions line.
- Device-only: no

**T1. Calendar smoke test for chanterelles**
- Depends on: T0
- Does: for one Pacific Northwest and one eastern box, estimate sighting chance for Cantharellus from ERA5-Land weather windows using target-group negatives, and compare with a model that sees only day of year and place. Random-date pseudo-absences run as a secondary comparison (D13).
- Verify: a report with Brier skill against the calendar model on held-out years, with bootstrap intervals, per region and per design.
- Verify before building: the premise that weather adds skill over the calendar is unconfirmed. No other model work starts until this reports.
- Device-only: no

**T2. Record audit for both groups**
- Depends on: T0
- Does: count usable records by region and year after dropping obscured coordinates, uncertainty above 250 m, default first-of-month dates and duplicates. Prepare a 200-photo hand-check sheet of genus-level chanterelle records with two agreeing identifiers.
- Verify: a count table, plus the misidentification rate once a person completes the sheet.
- Device-only: no. Person-only: the photo hand check.

**T3. Verify the from-memory layers**
- Depends on: T0
- Does: open the source page for each unverified row in DATA_REGISTER.md and record license, resolution, coverage and latency. Classify and record only.
- Verify: every register row reads verified or is marked for removal, and RESEARCH_LOG.md has one row per lookup.
- Device-only: no

**T4. Master grid and one layer, end to end**
- Depends on: T3
- Does: define the 250 m ESRI:102008 grid, bring SoilGrids pH onto it for western Washington, warp to Web Mercator and write a PMTiles archive.
- Verify: the archive opens in the PMTiles viewer with max zoom 9, and ten checked cells match the source within rounding.
- Device-only: no

**T5. Host trees and the border seam**
- Depends on: T3, T4
- Does: collapse BIGMAP and SCANFI to genus fraction with a source flag along a strip across the British Columbia and Washington border.
- Verify: transects across the border show no step larger than the variation inside each country, or the step is written up as a known artifact.
- Device-only: no

**T6. Observation layer**
- Depends on: T2
- Does: build an effort surface per weather cell and week from all fungal records, a benchmark taxon and a weekday term.
- Verify: the effort model reproduces the weekend effect and beats a constant-effort model on held-out deviance.
- Device-only: no

**T7. Habitat model, first version**
- Depends on: T4, T5, T6
- Does: fit presence-background models for both groups with the effort covariate, then predict with effort held constant and compute the area of applicability.
- Verify: a spatial block validation report by ecoregion and a mask map.
- Device-only: no

**T8. Trigger model and the joint challenger**
- Depends on: T1, T6
- Does: search the windows with randomisation checks, fit the trigger model, fit one joint model, and compare both on held-out years and ecoregions.
- Verify: a report that names the winner by Brier skill and lists each chosen window with its randomisation result.
- Device-only: no

**T9. Calibration and the publication gate**
- Depends on: T7, T8
- Does: calibrate to the meaning fixed in R3 and compute skill per ecoregion.
- Verify: each decile sits within 5 points of the observed rate, and the published set equals the passing set.
- Device-only: no

**T10. Nightly job and manifest**
- Depends on: T4, T9
- Does: fetch weather, update rolling features, score, mask, archive as COG, tile and write the manifest to an outbox folder.
- Verify: three nightly runs in a row, and one past date rebuilt from its manifest gives the same tile hash.
- Device-only: no

**T11. Vector companion and map client**
- Depends on: T10
- Does: write weather-cell polygons with sighting chance, uncertainty, top drivers and data dates to a second archive, and build the MapLibre page with tap to query.
- Verify: a tapped cell shows the same numbers as the scoring table for that cell and date.
- Device-only: yes. Tap targets and tile loading need a check on a real phone.
