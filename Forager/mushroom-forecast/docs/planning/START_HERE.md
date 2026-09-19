# Start here

As of 2026-09-18.

## Where things stand

Planning is complete enough to start. The owner is sending this pack to code agents to begin work in the
repo (D13). The author has not read the repo. The goal is a calibrated weekly sighting chance per forager
group and area, shown on a North America map only where the model beats a seasonal calendar.

Decisions agreed so far (full rows in DECISIONS.md):

- The target is a sighting chance per forager group, weather cell and week (D12). It is not a map of
  patches, and it is not a fruiting probability.
- North America is one pipeline and one grid. Each ecoregion switches on only after it beats a calendar
  baseline on held-out years.
- The model is habitat x trigger x observation, with one joint model kept as a challenger.
- Order of work: chanterelles first, chicken of the woods beside them as a control, morels as two models
  for spring 2027, then king boletes. Matsutake is on hold.
- Delivery is PMTiles on Cloudflare, set up separately through Cowork, with MapLibre on the client.
- Planning lives in the planning doc. Spec and task files live in the repo once building starts.

Next up: T0, then T1 to T3. T1 is the task most likely to overturn the plan, so it runs before any
pipeline work.

## Fixed terms

These words keep one meaning everywhere: in the spec, the code, the manifest and the map. If a sentence
needs one of them to mean something else, the sentence is wrong.

| Term | Meaning | Never means |
| --- | --- | --- |
| Sighting chance | The chance a forager group is reported in a weather cell and week, given at least one fungal observation of any kind there that week | The chance mushrooms are present, or the chance you will find them |
| Calibrated | Of all cell-weeks given 30%, about 30 in 100 have a report, checked on held-out years | Accurate for one spot or one trip |
| Relative habitat | The 250 m shading inside a weather cell. It ranks places and carries no percent | A probability |
| Forager group | A genus-level group such as chanterelles, with the species name stored | A single species |
| Calendar baseline | A model that sees only day of year and region | A forecast. It knows nothing about this year's weather |

## Working rules

- Append, mark, preserve. A published claim that turns out wrong gets a new dated row that quotes the old
  wording. It is never quietly edited.
- Every fact carries one of three flags: verified (source opened), abstract only, or from memory.
  From-memory items wait in the RESEARCH_LOG queue until someone checks them.
- Ideas stay in IDEAS.md until a test result moves them to DECISIONS.md. A good argument alone does not
  promote an idea.
- A task with no observable result is not a task. Each one names the check that proves it landed.
- Thresholds belong to the weather product they were fitted on. Never carry a number across products
  without refitting.
- No em dashes, plain words, short sentences.

## How we work

- One task, one session. Name the task, read this file, that task's dispatch, and only the rows needed.
- Docs hold decisions and pointers, never bulk data. Data stays out of git.
- Who decides what. The implementer decides names, formats and the order of small steps, and logs them.
  Anything that changes scope, cost, licenses or what users are told goes to the owner as a proposed row
  and waits for a yes.
- Every session ends the same way: update task status, add a session log row, say what was not checked.

## Session log

| Date | What was done | What is next |
| --- | --- | --- |
| 2026-09-18 | Evidence review, lag atlas published, North America data stack chosen, species order agreed, planning doc created, sighting chance named and confirmed (D12), planning pack exported for the repo (D13) | Code agents run T0, then T1 to T3 |
