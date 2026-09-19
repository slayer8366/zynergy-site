# T1. Calendar smoke test: does weather add skill over a calendar for chanterelles?

## State this was written against

- Written 2026-09-18, before any commit existed. Depends on T0 (layout agreed).
- Established: the quantity to estimate is sighting chance (START_HERE.md, Fixed terms; D12).
  North American research-grade Cantharellus records on iNaturalist: 25,888, with 17.3% hidden
  coordinates (EVIDENCE.md, pulled 2026-09-18).
- Unconfirmed premise this task exists to test: weather windows add skill over day of year alone.
  A published model for winter chanterelle scored AUC 0.85, but against random dates, which a plain
  calendar also beats. That result does not settle the question.

Scope: investigate and report, then stop. Do not build the grid, the habitat model, tiles or a pipeline.
If the answer is no, that is a valid and useful result.

## Verify first, and report before modelling

1. Records. Pull via a GBIF download (keep the DOI): kingdom Fungi, human observations, 2015 to 2025,
   with coordinates, inside the two boxes below. Report counts by box and year, for Cantharellus and for
   all fungi, before and after each filter. Confirm or disprove: "each box has at least 1,000 usable
   Cantharellus records across at least 8 years." If not, report and stop for the owner.
2. Weather. Confirm the Open-Meteo archive serves ERA5-Land daily mean temperature, precipitation, soil
   temperature 0 to 7 cm and soil moisture 0 to 7 cm for these boxes, and check its rate limits and
   terms for this use. If it does not fit, propose the Copernicus Climate Data Store instead and wait.
   Do not switch weather product silently: D7 fixes ERA5-Land.
3. Units. Confirm how you map a coordinate to an ERA5-Land cell (0.1 degree) and to an ISO week.

Boxes, for T1 only (ecoregions replace them after T3):
- Pacific Northwest: 42.0 to 49.5 N, 125.0 to 121.0 W
- East: 38.0 to 46.0 N, 84.0 to 70.0 W

## Then build

Filters: drop records with coordinate uncertainty above 1,000 m or missing (this also removes obscured
points), drop default dates (first of month at 00:00:00), keep one record per taxon, cell and day.

Primary design, which matches the fixed meaning of sighting chance:
- Unit: weather cell x ISO week.
- Eligible units: cell-weeks with at least one fungal record of any kind.
- Positive: an eligible cell-week with at least one Cantharellus record. Negative: eligible, with none.

Secondary design, for comparison with the literature only:
- Presences against 12 random-date pseudo-absences per record at the same coordinates.

Features, all computed from days strictly before the week (or date) being scored:
- Rolling windows of 3, 7, 14, 21, 28, 42, 56 and 90 days for mean temperature, summed precipitation,
  mean soil temperature and mean soil moisture.
- Calendar and place: day of year as sine and cosine, latitude, longitude.

Models, same algorithm and same fixed tuning budget for both:
- Calendar baseline: calendar and place features only.
- Full model: calendar and place plus the weather windows.
- Use gradient-boosted trees. Fix the hyperparameter search budget before looking at any test year.

Validation:
- Leave one year out, across all years, per box.
- Headline metric: Brier skill of the full model against the calendar baseline, with a bootstrap
  interval from 1,000 resamples of cell-weeks clustered by cell.
- Also report AUC and a reliability table by decile for the full model.

## Do not touch

- The definition of sighting chance, the box limits, the list of window lengths, or the year range,
  once you have seen any test result. Changing them afterwards turns a test into a search.
- DECISIONS.md, Fixed terms, SPEC.md requirements.
- Do not add habitat layers, elevation or tree data. This test is about timing only.

## Already considered and rejected

- Random dates as the headline test: a calendar also beats random dates, so it flatters any model (D13).
- Borrowing the porcini windows (20-day temperature, 26-day rain): fitted in Germany on a different
  weather product (D4).
- Daymet as the weather source: it cannot score the current week (D7).
- A static habitat model: it answers where, not when.
If you think any of this reasoning is wrong, say why in the report instead of implementing the alternative.

## Evidence to return

- The GBIF DOI, and the counts table by box, year and filter step.
- The skill table: box x design x metric, with intervals. The reliability table. The top ten features.
- Two tests that can fail: one proving no feature uses weather from on or after the scored date, one
  proving a positive cell-week never also appears as a negative.
- Seeds, package versions, run time and data sizes.
- A Conventions line (see T0).
- What you did not check.

How the owner will read the result: the interval excludes zero in both boxes, so T6 and T8 proceed.
In neither box, so phase 1 pauses for a rethink. In one box only, so the regional difference is the
next question.

## Device-only

None.
