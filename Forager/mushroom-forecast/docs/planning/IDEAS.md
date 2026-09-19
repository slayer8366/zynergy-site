# Ideas lab

As of 2026-09-18. An idea moves to DECISIONS.md only when its test result is in. This is the place to be
wrong cheaply.

| ID | Hypothesis | Cheapest test | Result that would change the plan | Status |
| --- | --- | --- | --- | --- |
| I1 | The strength of a plain calendar differs a lot between groups, and that should set the species order. | Fit day-of-year-only models for all 13 groups by ecoregion from existing records. | A group with a weak calendar and many records jumps the queue. Oysters are the candidate. | Untested |
| I2 | Genus-level chanterelle records with two agreeing identifiers are clean enough, which would quadruple the data. | The 200-photo hand check in T2. | An error rate above 5% keeps training on research grade only. | Untested |
| I3 | Obscured records still work for the trigger model, because a weather cell is about 11 km wide. The obscuring distance is from memory and needs checking. | Jitter open records by the obscuring distance and compare trigger skill with and without the jitter. | No loss of skill adds 17 to 26% more records to the trigger model. | Untested |
| I4 | Adjusting ERA5-Land temperature for elevation helps in the Cascades. | Compare adjusted values with Daymet and stations in one mountain ecoregion on held-out years. | A clear gain makes the adjustment part of D7. | Untested |
| I5 | Last year's tree growth (NDVI) predicts a good year, as it did in Soria. | Add a previous-year NDVI anomaly to the trigger model in T8. | Skill gain on held-out years adds a satellite layer to the nightly job. | Untested |
| I6 | A big year is rarely followed by another, as in the Yukon. | Add last year's regional report rate as a feature. | A negative carry-over effect becomes a standard feature. | Untested |
| I7 | Logged empty trips give true absences, which would upgrade D11 to an absolute probability. | A pilot with a few foragers, counting how many cell-weeks gain absence data in a month. | Enough coverage brings find logging into scope. | Untested |
| I8 | Soil DNA presences improve the habitat model where photos are sparse. | Count North American GlobalFungi samples with Cantharellus or Laetiporus hits. | Fewer than 100 samples drops the idea. | Untested |
| I9 | A public hindcast page builds trust: last month's forecast next to what was later reported. | Build it from the dated archives after 30 nightly runs. | It becomes part of the map if people use it. | Untested |
| I10 | Burn morels follow fire perimeter x severity x snowmelt timing. | Wait for the MTBS check in T3, then test on past western fire years. | It sets the design of the western morel model for spring 2027. | Untested |
