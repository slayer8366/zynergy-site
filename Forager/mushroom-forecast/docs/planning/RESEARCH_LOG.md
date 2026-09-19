# Research log

As of 2026-09-18. Log every lookup, dead ends included, so the search is not repeated.

## To verify

- [ ] MTBS: coverage, resolution, fire size threshold, latency, license
- [ ] NBAC for Canada: the same five facts
- [ ] NALCMS: resolution, years, license
- [ ] USGS 3DEP: resolution, coverage, access path
- [ ] POLARIS: resolution, variables, license
- [ ] CEC ecoregions: levels, license, download
- [ ] ESRI:102008: parameters, and whether GDAL and PROJ accept that code
- [ ] Radar beam blockage in the Cascades: a published coverage map or evaluation
- [ ] Open-Meteo: commercial terms, and whether the archive serves ERA5-Land soil variables across North America
- [ ] BIGMAP: resolution, species list, license
- [ ] SCANFI version 2: what changed and which species it maps
- [ ] The original source of the Saskatchewan chanterelle result
- [ ] Whether iNaturalist auto-obscures any target group at taxon level
- [ ] Structured fungal surveys in North America with full species lists, for true absences
- [ ] A North American equivalent of ForestTemp for under-canopy temperature
- [ ] Tsunoda et al. 2025 on matsutake: the actual window lengths
- [ ] Buntgen et al. 2012 on La Chaneaz: the fitted windows

## Log, newest first

| Date | Question | How it was checked | Result |
| --- | --- | --- | --- |
| 2026-09-18 | How many usable records per forager group? | iNaturalist API, place 97394 | Table in EVIDENCE.md |
| 2026-09-18 | How are raster PMTiles made? | PMTiles repo and its issue 338, rio-mbtiles readme | rio-pmtiles exists. rio-mbtiles needs at least three bands and can skip empty tiles. MBTiles converts with pmtiles convert |
| 2026-09-18 | Are there fitted weather windows for the Pacific Northwest? | One search, Oregon State forest mycology pages opened | Dead end. Harvest technique and thinning studies only |
| 2026-09-18 | Can Daymet score this week? | ORNL DAAC user guide | No. Monthly and provisional. The standard product runs from 1980 and is public domain |
| 2026-09-18 | Which radar rain products cover the continent? | NOAA slides, Canada open data | MRMS at about 1 km for 20 to 55 N. CaPA at 2.5 km for Canada since Feb 2018 |
| 2026-09-18 | Is there a Canadian tree species layer? | Canada open data | SCANFI, 30 m, 2020. Species uncertainty is high. Version 2 exists |
| 2026-09-18 | How to mask extrapolation? | CAST package docs | Area of applicability, based on distance to training data in predictor space |
| 2026-09-18 | How much does the forest floor differ from free air? | ForestTemp abstract | 2.1 C cooler in summer and 2.0 C warmer in winter. Europe only |
| 2026-09-18 | Is FABDEM usable? | GEE community catalog | Non-commercial license. Forest error falls from 5.15 m to 2.88 m |
| 2026-09-18 | Is there open soil DNA data? | GEE community catalog | GlobalFungi release 4, 57,184 samples, CC BY 4.0 |
| 2026-09-18 | What window did Tsunoda et al. 2025 find? | Two searches | Dead end. Abstract not retrieved. Known only secondhand as under two weeks |
