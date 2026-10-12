// Forager forecast, Pacific Northwest pilot demo: PNW model inputs (forager-forecast, Forager RECORD -772 to -777).
// The sighting-chance pilot layer is GeoJSON, drawn by pilot.js.
// Each raster layer is a folder of static z/x/y grey+alpha PNG tiles, zooms 5 to 9, every zoom taking
// the 250 m cell under each pixel's centre (nothing blended). The grey byte is decoded here
// and coloured in the browser:
//   soil:  grey = floor(pH * 10 + 0.5)
//   trees: grey = floor(percent * 2 + 0.5), 0 to 200; grey 255 with alpha 255 = Canada, pending;
//          grey 254 with alpha 255 = a US tile not computed yet. Neither occurs in today's tiles:
//          Canada's cells were filled from SCANFI v2 (Forager RECORD -839), and hemlock, which
//          SCANFI does not separate (forager-forecast D85), is alpha 0 there. Both codes stay
//          decoded so a tile carrying them still reads correctly.
// Alpha 0 is no data and stays transparent.
//
// Beneath every layer is our own street map (Forager RECORD -857, -858): vector tiles from our
// tile server, styled by the vendored basemap style code (light flavour), with its fonts and
// icons served from this site. Its town names are drawn above the coloured layers; the page has
// no place markers of its own. The coloured layers are drawn see-through, at the opacity the
// see-through slider sets (RECORD -859).
import * as maplibregl from './vendor/maplibre-gl.mjs';
import * as basemaps from './vendor/basemap/basemaps.mjs';
import { createPilot, CLASSES } from './pilot.js';

const LAYERS = {
  'soil-ph': { dir: 'data/soil-ph', lo: 4.5, hi: 8.0, unit: 'pH', decode: (g) => g / 10,
    fmt: (v) => `pH ${v.toFixed(1)}`, pending: false, thin: false,
    about: 'Soil pH, the mean of SoilGrids 2.0 blended over the top 30 cm.' },
  'tree-cover': { dir: 'data/tree-cover', lo: 0, hi: 100, unit: '% cover', decode: (g) => g / 2,
    fmt: (v) => `${v.toFixed(1)}% tree canopy cover`, pending: true, thin: false,
    about: 'Live tree canopy cover from TreeMap 2023 (US Forest Service) and, in Canada, SCANFI v2 (Natural Resources Canada).' },
  'douglas-fir': { dir: 'data/douglas-fir', lo: 0, hi: 100, unit: '% of canopy', decode: (g) => g / 2,
    fmt: (v) => `Douglas-fir: ${v.toFixed(1)}% of the canopy`, pending: true, thin: true,
    about: 'The share of the tree canopy that is Douglas-fir, one of the host trees the model uses.' },
  'hemlock': { dir: 'data/hemlock', lo: 0, hi: 100, unit: '% of canopy', decode: (g) => g / 2,
    fmt: (v) => `Hemlock: ${v.toFixed(1)}% of the canopy`, pending: true, thin: true, canada: true,
    noData: 'No hemlock value here: water, canopy cover under 10%, or Canada, where hemlock is not available',
    about: 'The share of the tree canopy that is hemlock, another of the host trees the model uses.' },
};
const VIRIDIS = [[68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142], [33, 144, 141],
  [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]];
const PENDING = [190, 190, 190]; // grey 255: Canada, pending (none since RECORD -839)
const MISSING = [120, 120, 120]; // grey 254: a US tile not computed yet (none today)

// Every coloured layer, input or forecast, is drawn at this opacity over the street map. The
// see-through slider sets it (owner, RECORD -859, superseding -857's fixed setting): 70% at
// load, kept across layer changes, not stored, so a reload returns to 70%.
let layerOpacity = 0.7;
// The legend shows each colour as it looks on the map: at layerOpacity over the street map's
// land colour, which is what lies beneath nearly every cell (RECORD -858). Over water or a town
// the same colour looks a little different; land is the case the legend is read against.
const LAND = basemaps.LIGHT.earth;
function hexRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function onMap(rgb) {
  const under = hexRgb(LAND);
  return `rgb(${rgb.map((c, i) => Math.round(c * layerOpacity + under[i] * (1 - layerOpacity))).join(',')})`;
}
function parseRgb(css) { return css.match(/\d+/g).slice(0, 3).map(Number); }

// Our street map. Tile address, bounds and zoom range as our tile server's TileJSON states them
// (/us.json, checked 2026-10-11: Protomaps Basemap 4.15.2, bounds -124.85, 24.4, -66.87, 49.6,
// zoom 0 to 15), written here rather than read from it so the credit below is the one shown:
// the TileJSON credits OpenStreetMap only, and the light style also draws landcover from ESA
// WorldCover, whose CC BY 4.0 licence asks for credit too.
const TILE_SERVER = 'https://forager-pmtiles.brandonlee1-894.workers.dev';
const HERE = new URL('.', location.href).href;
const STREET_SOURCE = { type: 'vector', tiles: [`${TILE_SERVER}/us/{z}/{x}/{y}.mvt`],
  bounds: [-124.85, 24.4, -66.87, 49.6], minzoom: 0, maxzoom: 15,
  attribution: '<a href="https://github.com/protomaps/basemaps">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>; landcover <a href="https://esa-worldcover.org/">ESA WorldCover</a>, CC BY 4.0' };
// The style's own background is left out, so the page's plain background still shows wherever
// the street map has no tiles.
const STREET_LAYERS = basemaps.layers('street', basemaps.LIGHT).filter((l) => l.type !== 'background');
const STREET_LABELS = basemaps.layers('street', basemaps.LIGHT, { labelsOnly: true, lang: 'en' });

function colour(t) {
  const x = Math.min(Math.max(t, 0), 1) * (VIRIDIS.length - 1);
  const k = Math.min(Math.floor(x), VIRIDIS.length - 2);
  const f = x - k;
  return VIRIDIS[k].map((c, i) => Math.round(c * (1 - f) + VIRIDIS[k + 1][i] * f));
}

// One tile's PNG bytes, or null where the tile holds nothing (the folder has every tile inside
// the layer's bounds, so a request outside them is never made).
async function tileBytes(name, z, x, y) {
  const resp = await fetch(new URL(`${LAYERS[name].dir}/${z}/${x}/${y}.png`, location.href).href);
  if (!resp.ok) throw new Error(`tile ${name} ${z}/${x}/${y}: HTTP ${resp.status}`);
  if (!(resp.headers.get('content-type') || '').startsWith('image/png')) {
    throw new Error(`tile ${name} ${z}/${x}/${y}: not a PNG`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}

async function decodePng(bytes) {
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  return { canvas, ctx, img: ctx.getImageData(0, 0, bmp.width, bmp.height) };
}

// pnw://<layer>/{z}/{x}/{y}: the layer's static tile, recoloured.
maplibregl.addProtocol('pnw', async (params) => {
  const m = params.url.match(/^pnw:\/\/([a-z-]+)\/(\d+)\/(\d+)\/(\d+)/);
  const spec = LAYERS[m[1]];
  const bytes = await tileBytes(m[1], +m[2], +m[3], +m[4]);
  const { canvas, ctx, img } = await decodePng(bytes);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const grey = d[i], alpha = d[i + 3];
    if (alpha === 0) continue;
    let rgb;
    if (spec.pending && grey === 254) rgb = MISSING;
    else if (spec.pending && grey > 200) rgb = PENDING; // 255 is pending; tiles take the nearest cell, so nothing blends into 201 to 253
    else rgb = colour((spec.decode(grey) - spec.lo) / (spec.hi - spec.lo));
    d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
  }
  ctx.putImageData(img, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return { data: new Uint8Array(await blob.arrayBuffer()) };
});

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    // Built by string, not new URL(), which would percent-encode the braces.
    glyphs: `${HERE}vendor/basemap/fonts/{fontstack}/{range}.pbf`,
    sprite: `${HERE}vendor/basemap/sprite/light`,
    sources: {
      street: STREET_SOURCE,
      lines: { type: 'geojson', data: new URL('data/lines.geojson', location.href).href,
        attribution: 'Lines: CEC Political Boundaries 2021, CC BY 4.0' },
    },
    // Bottom to top: plain background, street map, (the coloured layer, added before 'lines'),
    // borders, then the street map's names (owner, RECORD -858: "drawn on top").
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#eef0ea' } },
      ...STREET_LAYERS,
      { id: 'lines', type: 'line', source: 'lines', paint: { 'line-color': '#222', 'line-width': 0.8 } },
      ...STREET_LABELS,
    ],
  },
  bounds: [[-125, 40], [-111, 49]],
  fitBoundsOptions: { padding: 10 },
  // North edge just past the forecast box (owner, RECORD -858: "Stop panning just past the box"):
  // 49.6 N is the inputs' 49 N, the pilot strip's 49.5 N and a little margin, and is also where
  // our street map's coverage ends, so its edge cannot come into view.
  maxBounds: [[-131, 37], [-105, 49.6]],
  minZoom: 4.5,
  maxZoom: 12,
  attributionControl: { compact: true, customAttribution: 'SoilGrids 2.0 (ISRIC), TreeMap 2023 (USFS), SCANFI v2 (NRCan, OGL-Canada), CEC; layers CC BY-NC 4.0' },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

// The guide's entries, in the layer list's order: the raster layers, then the pilot.
const ALL_LAYERS = [...Object.keys(LAYERS), 'pilot'];
let pilot = null;

// The pilot layer's legend: its fixed classes, built once from pilot.js's table. Their colours
// are set by paintLegend, so they follow the slider.
const classSwatches = CLASSES.map((c) => {
  const row = document.createElement('div');
  row.className = 'key';
  const sw = document.createElement('span');
  sw.className = 'sw';
  row.append(sw, document.createTextNode(c.label));
  document.getElementById('pilot-classes').append(row);
  return [sw, parseRgb(c.rgb)];
});

// The colour bar and the pilot swatches, as the colours look on the map at the current opacity.
function paintLegend() {
  const stops = Array.from({ length: 9 }, (_, k) => `${onMap(colour(k / 8))} ${k * 12.5}%`);
  document.getElementById('bar').style.background = `linear-gradient(to right, ${stops.join(', ')})`;
  for (const [sw, rgb] of classSwatches) sw.style.background = onMap(rgb);
}
paintLegend();

// The see-through slider: live on the layer showing (raster-opacity for an input layer,
// fill-opacity for the forecast cells), and on the legend.
const slider = document.getElementById('see-through');
function setOpacity(percent) {
  layerOpacity = percent / 100;
  document.getElementById('see-through-value').textContent = `${percent}%`;
  slider.setAttribute('aria-valuetext', percent === 0 ? 'Street map only' : `Layer ${percent}% solid`);
  if (map.getLayer('data')) map.setPaintProperty('data', 'raster-opacity', layerOpacity);
  if (map.getLayer('pilot-fill')) map.setPaintProperty('pilot-fill', 'fill-opacity', layerOpacity);
  paintLegend();
}
slider.addEventListener('input', () => setOpacity(Number(slider.value)));
// A browser may restore a form control's last value on reload; the ruling is that a reload starts
// at 70% again, so the slider is reset from the code's value rather than trusted.
slider.value = String(Math.round(layerOpacity * 100));

// The guide shows the entry for the layer on screen first.
function orderGuide(name) {
  const entries = document.getElementById('guide-entries');
  for (const el of entries.querySelectorAll('.guide-entry')) el.classList.toggle('active', el.dataset.layer === name);
  for (const key of [name, ...ALL_LAYERS.filter((k) => k !== name)]) {
    entries.append(entries.querySelector(`.guide-entry[data-layer="${key}"]`));
  }
}

let current = 'soil-ph';
function show(name) {
  current = name;
  if (!pilot) return; // before the map loads; the load handler shows the current layer
  if (map.getLayer('data')) map.removeLayer('data');
  if (map.getSource('data')) map.removeSource('data');
  const isPilot = name === 'pilot';
  document.getElementById('inputs-panel').hidden = isPilot;
  document.getElementById('pilot-legend').hidden = !isPilot;
  document.getElementById('inputs-label').hidden = isPilot;
  document.body.dataset.layer = name;
  if (isPilot) {
    pilot.show();
    document.getElementById('about').textContent = 'A sighting chance per 0.1 degree weather cell, from a pilot model of chanterelle reports in the Pacific Northwest strip.';
    orderGuide(name);
    return;
  }
  pilot.hide();
  const spec = LAYERS[name];
  map.addSource('data', { type: 'raster', tiles: [`pnw://${name}/{z}/{x}/{y}`], tileSize: 256,
    minzoom: 5, maxzoom: 9, bounds: [-125, 40, -111, 49] });
  map.addLayer({ id: 'data', type: 'raster', source: 'data',
    paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0, 'raster-opacity': layerOpacity } }, 'lines');
  document.getElementById('lo').textContent = spec.lo;
  document.getElementById('hi').textContent = spec.hi;
  document.getElementById('unit').textContent = spec.unit;
  document.getElementById('key-canada').hidden = !spec.canada;
  document.getElementById('key-thin').hidden = !spec.thin;
  document.getElementById('about').textContent = spec.about;
  orderGuide(name);
  document.getElementById('readout').textContent = 'Tap the map to read the value at a spot.';
}

// The value under a tap: the zoom-9 pixel's grey byte, decoded.
async function valueAt(lngLat) {
  const z = 9, n = 2 ** z;
  const x = (lngLat.lng + 180) / 360 * n;
  const s = Math.sin(lngLat.lat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  if (x < 0 || y < 0 || x >= n || y >= n) return null;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  // Outside the layer's bounds there is no tile, and nothing to read.
  if (lngLat.lng < -125 || lngLat.lng > -111 || lngLat.lat < 40 || lngLat.lat > 49) return null;
  const bytes = await tileBytes(current, z, x0, y0);
  const { img } = await decodePng(bytes);
  const px = Math.floor((x % 1) * img.width), py = Math.floor((y % 1) * img.height);
  const i = (py * img.width + px) * 4;
  return { grey: img.data[i], alpha: img.data[i + 3] };
}

map.on('click', async (e) => {
  if (current === 'pilot') return; // pilot.js reads its own cells
  const out = document.getElementById('readout');
  const spec = LAYERS[current];
  let v;
  try {
    v = await valueAt(e.lngLat);
  } catch (err) {
    console.error('tap read failed', err);
    window.pnwErrors.push(String(err));
    out.textContent = 'Could not read the value here. Try again in a moment.';
    return;
  }
  window.pnwLastTap = { layer: current, lng: e.lngLat.lng, lat: e.lngLat.lat, grey: v ? v.grey : null, alpha: v ? v.alpha : null }; // for checks
  const where = `${e.lngLat.lat.toFixed(3)} N, ${(-e.lngLat.lng).toFixed(3)} W`;
  if (!v || v.alpha === 0) out.textContent = `${spec.noData || 'No data here'} (${where}).`;
  else if (spec.pending && v.grey === 255) out.textContent = `Canada: not computed yet, waits for the Canadian tree data (${where}).`;
  else if (spec.pending && v.grey === 254) out.textContent = `Not computed yet (${where}).`;
  else out.textContent = `${spec.fmt(spec.decode(v.grey))} (${where}).`;
});

// The map's attribution starts collapsed to its (i) button, one tap away, on every width,
// instead of MapLibre's default of showing it open until the first drag. First on narrow maps
// (planner, after the pilot's mobile screenshots: the Copernicus string covered the bottom third
// of the map), then on wide ones too (owner, Forager RECORD -895: "the map's credit box starts
// collapsed on desktop as on phones, opened by its (i)"), after the weather model's four
// Copernicus notices covered the lower part of the desktop map. Runs at load and on resize only,
// so a user's own tap to open it is left alone between resizes.
function collapseAttribution() {
  const box = document.querySelector('#map .maplibregl-ctrl-attrib');
  if (!box) return;
  box.classList.remove('maplibregl-compact-show');
  box.removeAttribute('open');
}
map.on('resize', collapseAttribution);
map.on('load', () => {
  collapseAttribution();
  pilot = createPilot(map, maplibregl, { opacity: () => layerOpacity });
  show(current);
  map.once('idle', () => { document.body.dataset.ready = '1'; });
});
document.getElementById('layers').addEventListener('change', (e) => {
  show(e.target.value);
});
window.pnwErrors = [];
map.on('error', (e) => {
  const msg = e && e.error ? e.error.message : String(e);
  window.pnwErrors.push(msg);
  console.error('map error', msg);
});
window.pnwMap = map; // for checks
