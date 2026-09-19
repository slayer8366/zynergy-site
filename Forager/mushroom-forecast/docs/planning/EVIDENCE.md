# Evidence

As of 2026-09-18.

## Record counts by forager group

Source: iNaturalist API, North America place (id 97394), pulled 2026-09-18. Raw output is in
`evidence/inat_counts_2026-09-18.json` and the script is in `scripts/inat_counts.py`.

| Group | Research-grade records | All verifiable records | Hidden coordinates (%) | Top three months | Share of records in those months (%) |
| --- | --- | --- | --- | --- | --- |
| Chicken of the woods (Laetiporus) | 62,144 | 101,830 | 8.1 | Aug to Oct | 66 |
| Oysters (Pleurotus) | 43,829 | 140,387 | 7.4 | May, Jun, Aug | 45 |
| Chanterelles (Cantharellus) | 25,888 | 104,668 | 17.3 | Jul to Sep | 59 |
| Lion's mane group (Hericium) | 25,353 | 40,727 | 10.7 | Sep to Nov | 67 |
| Morels (Morchella) | 19,686 | 46,230 | 26.1 | Mar to May | 89 |
| Boletus, whole genus | 17,923 | 38,918 | 19.9 | Jul, Aug, Oct | 56 |
| Lobster (Hypomyces lactifluorum) | 17,754 | 18,269 | 9.9 | Jul to Sep | 78 |
| Craterellus (trumpets, winter chanterelle) | 15,760 | 29,582 | 15.3 | Jul to Sep | 54 |
| Hen of the woods (Grifola frondosa) | 10,915 | 13,326 | 13.3 | Sep to Nov | 96 |
| Cauliflower (Sparassis) | 8,269 | 12,877 | 11.5 | Aug to Oct | 68 |
| King bolete (Boletus edulis label only) | 7,441 | 10,835 | 23.2 | Aug to Oct | 61 |
| Hedgehogs (Hydnum) | 1,850 | 12,831 | 15.6 | Aug to Oct | 50 |
| Matsutake (T. murrillianum and T. magnivelare) | 1,722 | 1,982 | 34.3 | Oct to Dec | 77 |

How to read it. Hidden means the observer chose obscured or private coordinates, so the point is useless
for the habitat layer. Research grade undercounts any group where species-level identification is hard,
which is why chanterelles have four times as many verifiable records. A high share in the top three
months means a plain calendar already explains most of the timing.

## Published findings that matter for North America

Only the Missouri morel work gives a fitted trigger window for this continent, and nothing fitted exists
for the Pacific Northwest. The full catalogue of 15 studies is in `evidence/fruiting-lag-atlas.html`
(also published at https://claude.ai/artifact/5NKAXC42WV8AGfTovbVNiQ).

| Group | Finding | Where | Flag | Source |
| --- | --- | --- | --- | --- |
| Yellow morels | Soil temperature accumulated above 32 F over the prior 20 days best predicts first appearance. Rain events over 10 mm in the prior 30 days track abundance, not onset. Warm winters delay fruiting past the prediction. | Missouri | Abstracts read | [Mihail et al. 2007](https://pubmed.ncbi.nlm.nih.gov/17363234/), [Mihail 2014](https://namyco.org/publications/mcilvainea-journal-of-american-amateur-mycology/is-it-time-for-morels-yet/) |
| Chanterelles | About 500 growing degree days (base 5 C) with 50 to 100 mm of rain or soil moisture, 6 to 13 weeks before first appearance. Based on buyer records. | Northern Saskatchewan | Abstract only, seen in a listing. Original not located | Not linked |
| All mushrooms, unidentified | June rain plus the previous year's May rain explained 85% of crop variation. A big year never followed a big year. | Kluane, Yukon | Abstract read | [Krebs et al. 2008](https://cdnsciencepub.com/doi/10.1139/B08-094) |
| Winter chanterelle | Tree ensembles on 67 weather features reached a mean AUC of 0.85 on held-out years. Scored against random dates, which a calendar would also beat. | Europe and North America | Preprint, opened | [bioRxiv 2023](https://www.biorxiv.org/content/10.1101/2023.05.05.539567v1.full) |
| Porcini | Peak near 13 C over the prior 20 days, rising with rain over the prior 26 days. Untested in North America. | Bielefeld, Germany | Preprint, opened | [bioRxiv 2026](https://www.biorxiv.org/content/10.64898/2025.12.12.693895.full.pdf) |
| Matsutake and chanterelles | Studies cover harvest technique and thinning. No fitted weather windows were found. | Oregon and Washington | Opened | [Luoma et al. 2006](https://www.fsl.orst.edu/mycology/LuomaEtal_2006.pdf), [Pilz et al. 2006](https://www.fsl.orst.edu/mycology/PilzPage_files/PilzMolinaMayo06-Chanterelles.pdf) |
| Wood-decay fungi | Drivers differ by genus and seasonality is loose, unlike mycorrhizal fungi. This sets the expectation for the control group. | Kyoto, Japan | Opened | [Sato et al. 2012](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0049777) |
| Post-fire morels | Occupied microsites cluster at scales under 7 m. | Western conifer forest | Abstract read | [Larson et al. 2016](https://www.researchgate.net/publication/305775164_Post-fire_morel_Morchella_mushroom_abundance_spatial_structure_and_harvest_sustainability) |

## Methods the plan leans on

| Method | What it gives | Source |
| --- | --- | --- |
| Sliding-window search with randomisation checks | Learned windows with a guard against false positives | [Bailey and van de Pol 2016](https://doi.org/10.1371/journal.pone.0167980) |
| Temporal pseudo-absences and a benchmark taxon | A way to model timing from presence-only records. Bias correction changed skill little in their test | [bioRxiv 2023](https://www.biorxiv.org/content/10.1101/2023.05.05.539567v1.full) |
| Separate detection term | An empty survey is not read as an absent fungus | [Sato et al. 2012](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0049777) |
| Integrated distribution models | Integration alone does not fix spatial bias. A bias covariate or spatial term is needed | [Simmonds et al. 2020](https://nora.nerc.ac.uk/id/eprint/528191/1/N528191JA.pdf) |
| Area of applicability | Masks cells unlike anything in training | [CAST package](https://cran.r-project.org/web/packages/CAST/vignettes/cast04-AOA-tutorial.html) |
| Previous-year NDVI and satellite soil moisture | Lifted yield models to adjusted R2 of up to 0.63 in Soria | [Olano et al. 2020](https://www.sciencedirect.com/science/article/abs/pii/S0168192320301179) |
| Raster PMTiles | rio-pmtiles, or rio-mbtiles then pmtiles convert. The tiler needs at least three bands | [PMTiles repo](https://github.com/protomaps/PMTiles), [rio-mbtiles](https://github.com/mapbox/rio-mbtiles) |
