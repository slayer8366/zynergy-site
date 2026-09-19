# Mushroom fruiting forecast: planning pack

Written 2026-09-18 against no commit. The author (Claude, in a planning chat with the owner) has not read
the repo and does not know whether it exists yet. Every path in this pack is a proposal until T0 confirms
or corrects it.

Living planning doc (source of these files): https://claude.ai/code/artifact/c196437c-c7a3-463e-9046-410eb0cb861b
Evidence page (15 published lag studies, searchable): https://claude.ai/artifact/5NKAXC42WV8AGfTovbVNiQ

## What to read, in order

1. `docs/planning/START_HERE.md`  where things stand, fixed terms, working rules
2. `docs/planning/DECISIONS.md`   dated decisions. Rows are never edited, only superseded
3. `docs/planning/SPEC.md`        goal, scope, requirements R1 to R8
4. `docs/planning/TASKS.md`       T0 to T11 with depends on, does, verify
5. `docs/dispatch/`               one file per task that is ready to hand off (T0 to T3 today)

Reference: `DATA_REGISTER.md`, `EVIDENCE.md`, `RESEARCH_LOG.md`, `IDEAS.md`, and `evidence/`.

## Rules for any agent working from this pack

- Start with `docs/dispatch/2026-09-18-t0-repo-bootstrap.md`. It asks you to check the repo's own
  conventions first and to move these files to match them.
- Do the "Verify first" section of a dispatch and report it before building anything.
- Never edit a row in DECISIONS.md, the Fixed terms, or a requirement in SPEC.md. If one looks wrong,
  say so in your report. The owner decides.
- The number this project produces is called **sighting chance**. It is never called fruiting probability.
  See Fixed terms.
- Flag every fact as verified, abstract only, or from memory. Do not upgrade an assumption to a fact.
- State plainly what you did not check.
