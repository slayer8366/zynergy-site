# Data register

As of 2026-09-18. Flags: verified means the linked page was seen or opened that day, secondhand means a
third party described it, memory means unchecked. Memory rows wait on T3. Record a license here before a
layer is used.

| Layer | Role | Coverage | Resolution | Latency | License | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| [ERA5-Land via Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api) | Weather for training and serving, incl. soil temperature and moisture | Global | 0.1 degree, about 11 km, hourly, from 1950 | 5 days | Free tier is non-commercial. Terms to confirm | Verified |
| [Daymet V4](https://daac.ornl.gov/DAYMET/guides/Daymet_V4_Daily_MonthlyLatency.html) | Training-only test of 1 km weather in the Cascades | Continental North America, Hawaii, Puerto Rico | 1 km, daily, from 1980 | Monthly, provisional | Public domain | Verified |
| [MRMS rain](https://www.roc.noaa.gov/WSR88d/PublicDocs/TAC/2016/MRMS_TAC_Howard.pdf) | Rain upgrade to test against gauges | 20 to 55 N, 130 to 60 W | 0.01 degree, about 1 km | Minutes | Not checked | Verified specs, access path not checked |
| [CaPA HRDPA](https://open.canada.ca/data/dataset/eff69d42-ce81-4672-867f-cc3baaf4157a) | Rain upgrade for Canada | Canada | 2.5 km, 6 h and 24 h totals, from Feb 2018 | Preliminary 1 h after valid time | To confirm | Verified |
| [BIGMAP species biomass](https://data.fs.usda.gov/geodata/rastergateway/bigmap/index.php) | Host trees, US | US | 30 m (from memory), 2018 | Static | Not checked | Verified exists, resolution from memory |
| [SCANFI](https://open.canada.ca/data/en/dataset/18e6a919-53fd-41ce-b4e2-44a9707c52dc) | Host trees, Canada | Canada except Arctic | 30 m, 2020 | Static. A version 2 exists | Open Government Licence, Canada | Verified. Authors rate species layers for regional scale |
| [SoilGrids 2.0](https://docs.isric.org/globaldata/soilgrids/) | Soil pH, carbon, texture, nitrogen, with 90% intervals | Global | 250 m | Static | CC BY 4.0 | Verified |
| SSURGO | Finer soil for the US | US | Finer than SoilGrids | Static | Not checked | Secondhand |
| [Copernicus GLO-30](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30_2024_1) | Terrain. A surface model, so canopy biases it | Global | 30 m | Static | Free, own license | Verified |
| [FABDEM](https://gee-community-catalog.org/projects/fabdem/) | Bare-earth terrain. Excluded for now | Global, 60 S to 80 N | 30 m | Static | CC BY-NC-SA 4.0, non-commercial | Verified |
| [GlobalFungi](https://gee-community-catalog.org/projects/global_fungi/) | Below-ground presence from soil DNA | Global, 57,184 samples in release 4 | Points | Releases | CC BY 4.0 | Verified |
| GBIF downloads, incl. iNaturalist research grade, plus Mushroom Observer | Fruiting records | Global | Points | On demand, with a DOI | Per record | Verified |
| MTBS and NBAC | Burn perimeters and severity for morels | US and Canada | Not checked | Not checked | Not checked | Memory |
| NALCMS | Land cover and forest mask | North America | Not checked | Not checked | Not checked | Memory |
| USGS 3DEP | Bare-earth terrain, US | US | Not checked | Static | Not checked | Memory |
| POLARIS | Probabilistic soil, US | US | Not checked | Static | Not checked | Memory |
| CEC ecoregions | Validation blocks and publication units | North America | Polygons | Static | Not checked | Memory |
| ESRI:102008 | Compute projection | North America | n/a | n/a | n/a | Memory. Parameters to confirm |
