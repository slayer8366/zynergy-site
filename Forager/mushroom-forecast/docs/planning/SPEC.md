# Spec

As of 2026-09-18. Changes to Decisions or Requirements need a new row in DECISIONS.md first.

## Goal

A forager in North America opens a map and sees a calibrated weekly sighting chance for a forager group in
their area, with honest gaps wherever the model has no support. Sighting chance is defined in R3 and fixed
by decision D12.

## Scope

- Phase 1 groups: chanterelles (Cantharellus, modelled as one forager group) and chicken of the woods
  (Laetiporus) as the control.
- One continental pipeline: static habitat layers on a 250 m equal-area grid, weather features on the
  weather product's own grid.
- Three model parts (habitat, trigger, observation) plus one joint model as challenger.
- Nightly scoring that writes one dated PMTiles archive per group, a vector companion at weather-cell
  scale, and a manifest.
- Validation by ecoregion and held-out year against a day-of-year baseline.

## Out of scope

- Anything finer than 250 m. Post-fire morels cluster below 7 m, which no open grid can resolve.
- Species identification and edibility advice.
- Cloudflare setup, which is handled separately through Cowork.
- Matsutake, hen of the woods, oysters and lobster until phase 1 results are in.
- Mexico and the Arctic in phase 1. No verified tree layer covers them, so they stay masked.
- User accounts and find logging. Both sit in IDEAS.md for now.

## Decisions

An implementer must not revisit these without a new row in DECISIONS.md.

- The output is a sighting chance per group, weather cell and week, shaded inside each cell by relative
  habitat (D12). The evidence supports timing and rough location, not patches.
- Compute in North America Albers equal-area (ESRI:102008) and display in Web Mercator. Statistics need
  equal cells, and web tiles need Mercator.
- Train and serve on the same weather product, ERA5-Land. Thresholds belong to their product, and Daymet
  arrives a month late.
- Habitat x trigger x observation, with a joint model as challenger. The two-step process is only a
  working hypothesis in the literature.
- Trigger windows are learned from records. No published windows exist for the Pacific Northwest, and
  European windows are untested here.
- Host trees collapse to genus fraction with a source flag, because the US and Canadian tree layers do
  not match.
- Tiles stop at zoom 9. At 45 N that is about 216 m per pixel, which matches 250 m cells.
- Groups are modelled at genus level and the species name is stored. Names do not hold continent-wide.

## Requirements

- R1. Every scored cell carries a sighting chance, an uncertainty and an in-or-out applicability flag.
  Check: sample 1,000 cells from one nightly output and find none missing any of the three.
- R2. An ecoregion is published only if Brier skill against the day-of-year baseline is above zero on
  held-out years, with a bootstrap interval that excludes zero. Check: the published set equals the
  passing set in the validation report.
- R3. Calibration has a stated meaning: the chance the group is reported in a weather cell and week,
  given that at least one fungal observation of any kind was made there that week. This number is called
  sighting chance (D12) and is never labelled fruiting probability. Check: on held-out years each
  probability decile sits within 5 points of the observed rate.
- R4. Every nightly output records model version, weather dates and layer versions in its manifest.
  Check: rebuild one past date from its manifest and get tiles with the same hash.
- R5. No tile exists above zoom 9, and cells outside the area of applicability are transparent.
  Check: read the archive metadata and spot-check ten masked cells.
- R6. Records with user-obscured coordinates, or coordinate uncertainty above 250 m, never reach habitat
  training. Check: a count of such records in the training table returns zero.
- R7. Serve-time weather features stay inside the range seen in training. Check: a nightly drift report
  flags any feature outside its training range.
- R8. Only the weather-cell value carries a percent and the label sighting chance. The 250 m raster is
  labelled relative habitat and shows no percent. Check: read the legend and the tap panel, and search
  every output string for "fruiting probability" with zero hits.

## Constraints

- Open data only, with each license recorded in DATA_REGISTER.md before a layer is used.
- FABDEM stays out while commercial use is possible. Its license is non-commercial.
- Bulk record pulls go through GBIF downloads, which give a citable DOI. The iNaturalist API is for
  counts and spot checks only.
- No statistics are computed in tile space, because Mercator inflates northern cells.
- This plan does not touch the Cloudflare setup.

## Acceptance

Phase 1 is done when all four hold.

- The chanterelle model has been scored against the calendar baseline in every ecoregion with enough
  records, on held-out years.
- The nightly job has published dated archives and a manifest for 14 days in a row.
- The map shows sighting chance, shows uncertainty and data dates on tap, and leaves masked areas blank.
- The result is written up either way. If no ecoregion beats the calendar, that negative result is the
  deliverable and phase 1 still counts as done.

## Unverified

- From memory and not yet checked: MTBS, NBAC, NALCMS, USGS 3DEP, POLARIS, CEC ecoregions, radar blockage
  in the mountain West, and the exact parameters of ESRI:102008.
- Whether genus-level chanterelle records with two agreeing identifiers are clean enough. False
  chanterelle and jack-o'-lantern are the likely contaminants.
- Whether 11 km weather carries enough signal in the Cascades, where a valley and a ridge share one cell.
- No codebase has been read by the author.

## Open questions

- Should Mexico and the Arctic stay masked in phase 1, or should someone look for a tree layer that
  covers them?
- Is the tool commercial? The answer decides FABDEM and the terms of the Open-Meteo free tier, which is
  for non-commercial use.
- Who supplies true absences, and when does find logging enter scope?
