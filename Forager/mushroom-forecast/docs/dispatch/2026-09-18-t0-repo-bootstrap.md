# T0. Repo bootstrap: report conventions, commit the planning pack

## State this was written against

- Written 2026-09-18 by Claude in a planning chat with the owner. No commit, no branch head: the author
  has not read the repo and does not know whether it exists or is empty.
- Established: the plan, decisions D1 to D13, requirements R1 to R8 (see docs/planning/).
- Still open: where this repo keeps docs, decisions and dispatches. The paths in this pack are proposals.

Scope: report, commit the pack, propose a layout, then stop. Do not build models, grids or tiles.

## Verify first, and report before changing anything

1. Does the repo exist? Report the default branch and the commit at its head, or say it is empty.
2. Is there an existing convention for docs, decision records or dispatch files? Name the paths and one
   example of each. If there is one, it wins: move these files to match it and list what moved where.
3. What tooling is present: language versions, package manager, CI, linters, license file?
4. Confirm or disprove this assumption: "Python is the working language for T1 to T9." If the repo
   already points elsewhere, say so and stop for the owner.

## Then do

- Commit the planning pack with its content unchanged. One commit, message names this dispatch.
- Add a .gitignore that keeps data, downloads, model artifacts, tiles and secrets out of git.
- Add a pointer to docs/planning/START_HERE.md from the top-level README.
- Propose, in your report only, a minimal layout for T1 and T2: source folder, scripts or notebooks,
  tests, an environment file with pinned versions, and a data folder that is ignored. Do not create it
  until the owner agrees.

## Do not touch

- Any row in DECISIONS.md, the Fixed terms in START_HERE.md, or a requirement in SPEC.md. These were
  decided deliberately. If one looks wrong, say why in the report and leave it.
- Cloudflare, PMTiles or MapLibre setup. That is handled separately (D6).
- The name sighting chance (D12). Do not shorten it to probability anywhere.

## Already considered and rejected

- Keeping the plan only in chat or a wiki: rejected in D10, because an agent should read the original file.
- If you think the pack belongs somewhere other than docs/, say why instead of silently relocating it.

## Evidence to return

- The commit hash and a tree listing of what landed.
- A Conventions line: which existing files or neighbouring repos you checked, what convention you found,
  and whether you followed it. "None checked" is allowed. A blank is not.
- Anything you could not verify, stated plainly.

## Device-only

None.
