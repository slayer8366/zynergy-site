# T3. Verify the from-memory data layers

## State this was written against

- Written 2026-09-18, before any commit existed. Depends on T0. Needs web access.
- Established: twelve rows in DATA_REGISTER.md were seen on 2026-09-18. Six rows are flagged Memory, and
  several verified rows still have "Not checked" cells.
- These facts came from the author's memory and may be wrong: MTBS, NBAC, NALCMS, USGS 3DEP, POLARIS,
  CEC ecoregions, the parameters of ESRI:102008, and "BIGMAP is 30 m".

Scope: classify and record. Do not download bulk data, do not build anything, do not drop a layer.

## Do

For every row in DATA_REGISTER.md with a Memory flag or a "Not checked" cell, and for every unticked
item in RESEARCH_LOG.md "To verify":

1. Open the primary source page (the producing agency or the paper), not a summary of it.
2. Record coverage, resolution, latency or update cycle, license, and the access path.
3. Append the result as a new dated row in RESEARCH_LOG.md, dead ends included.
4. In DATA_REGISTER.md, do not overwrite the old cell. Add the verified value with its date and source
   link beside it, so a reader can see what was assumed and what was found.
5. For ESRI:102008, report the parameters and whether the installed GDAL and PROJ accept the code.
   If they do not, give the equivalent definition string.

## Do not touch

- Decisions about which layers are used. If a license rules a layer out, say so in the report.
  The owner decides (the commercial-use question in SPEC.md is still open).
- Any flag that you did not personally check today.

## Already considered and rejected

- Trusting summaries, catalog mirrors or blog posts for license terms: a license is read at its source.

## Evidence to return

- The updated register and log, plus a short list: confirmed as remembered, corrected (old value, new
  value, source), and could not be verified.
- A Conventions line, and what you did not check.

## Device-only

None.
