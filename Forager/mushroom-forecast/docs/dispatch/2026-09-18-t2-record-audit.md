# T2. Record audit for chanterelles and chicken of the woods

## State this was written against

- Written 2026-09-18, before any commit existed. Depends on T0. Can share the GBIF pull with T1.
- Established: iNaturalist counts for North America on 2026-09-18 (EVIDENCE.md). Cantharellus has
  25,888 research-grade and 104,668 verifiable records. Laetiporus has 62,144 research-grade records.
- Unconfirmed: that genus-level Cantharellus records with two agreeing identifiers are clean enough to
  train on. False chanterelle and jack-o'-lantern are the likely contaminants.

Scope: classify and record. Do not fix, relabel or drop anything from the source data.

## Verify first, and report before counting

1. How GBIF exposes iNaturalist identification agreement and user-obscured coordinates. If GBIF does not
   carry what is needed, say so and propose the smallest iNaturalist pull that does. The iNaturalist API
   is for counts and spot checks only (SPEC.md, Constraints).
2. Whether iNaturalist obscures any target taxon automatically. Report what you find with its source.

## Then build

- A count table for each group by year and by region (use the T1 boxes plus "rest of North America"),
  after each filter in turn: user-obscured, coordinate uncertainty above 250 m or missing, default
  first-of-month dates, duplicates of the same observer, cell and day.
- A random sample of 200 genus-level Cantharellus records that have at least two agreeing identifiers
  and are not research grade, written as a CSV with record link, photo link, date, state or province,
  and empty columns "verdict" and "notes".

## Do not touch

- Source records. Filters are applied to a copy and every step is counted.
- The 250 m threshold (R6) and the group definitions (D9, D12).

## Already considered and rejected

- Training on research grade only without checking the alternative: it throws away three quarters of
  the chanterelle records before knowing whether they are clean (IDEAS.md, I2).

## Evidence to return

- The count tables, the GBIF DOI, the sampling seed, and the CSV.
- A test that can fail: re-running the sampler with the same seed gives the same 200 records.
- A Conventions line, and what you did not check.

## Person-only, not device-only

- A person who knows chanterelles opens each of the 200 photo links and fills "verdict" with one of:
  chanterelle, not a chanterelle, cannot tell. An error rate above 5% means training stays on
  research grade only.
