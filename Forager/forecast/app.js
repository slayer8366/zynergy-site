// Forager forecast test area: PNW model inputs (forager-forecast, Forager RECORD -772 to -777).
// Each layer is a folder of static z/x/y grey+alpha PNG tiles, zooms 5 to 9, every zoom taking
// the 250 m cell under each pixel's centre (nothing blended). The grey byte is decoded here
// and coloured in the browser:
//   soil:  grey = floor(pH * 10 + 0.5)
//   trees: grey = floor(percent * 2 + 0.5), 0 to 200; grey 255 with alpha 255 = Canada, pending;
//          grey 254 with alpha 255 = a US tile not computed yet (none today)
// Alpha 0 is no data and stays transparent.
import * as maplibregl from './vendor/maplibre-gl.mjs';

const LAYERS = {
  'soil-ph': { dir: 'data/soil-ph', lo: 4.5, hi: 8.0, unit: 'pH', decode: (g) => g / 10,
    fmt: (v) => `pH ${v.toFixed(1)}`, pending: false, thin: false,
    about: 'Soil pH, the mean of SoilGrids 2.0 blended over the top 30 cm.' },
  'tree-cover': { dir: 'data/tree-cover', lo: 0, hi: 100, unit: '% cover', decode: (g) => g / 2,
    fmt: (v) => `${v.toFixed(1)}% tree canopy cover`, pending: true, thin: false,
    about: 'Live tree canopy cover from TreeMap 2023 (US Forest Service).' },
  'douglas-fir': { dir: 'data/douglas-fir', lo: 0, hi: 100, unit: '% of canopy', decode: (g) => g / 2,
    fmt: (v) => `Douglas-fir: ${v.toFixed(1)}% of the canopy`, pending: true, thin: true,
    about: 'The share of the tree canopy that is Douglas-fir, one of the host trees the model uses.' },
  'hemlock': { dir: 'data/hemlock', lo: 0, hi: 100, unit: '% of canopy', decode: (g) => g / 2,
    fmt: (v) => `Hemlock: ${v.toFixed(1)}% of the canopy`, pending: true, thin: true,
    about: 'The share of the tree canopy that is hemlock, another of the host trees the model uses.' },
};
const VIRIDIS = [[68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142], [33, 144, 141],
  [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]];
const PENDING = [190, 190, 190]; // grey 255: Canada, waits for SCANFI
const MISSING = [120, 120, 120]; // grey 254: a US tile not computed yet (none today)
const PLACES = [['Seattle', -122.332, 47.606], ['Portland', -122.679, 45.515], ['Spokane', -117.426, 47.659],
  ['Boise', -116.202, 43.615], ['Eugene', -123.087, 44.052], ['Bend', -121.315, 44.058],
  ['Redding', -122.392, 40.587], ['Missoula', -113.994, 46.872], ['Medford', -122.875, 42.327],
  ['Yakima', -120.505, 46.602]];

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
    sources: {
      lines: { type: 'geojson', data: new URL('data/lines.geojson', location.href).href,
        attribution: 'Lines: CEC Political Boundaries 2021, CC BY 4.0' },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#eef0ea' } },
      { id: 'lines', type: 'line', source: 'lines', paint: { 'line-color': '#222', 'line-width': 0.8 } },
    ],
  },
  bounds: [[-125, 40], [-111, 49]],
  fitBoundsOptions: { padding: 10 },
  maxBounds: [[-131, 37], [-105, 52]],
  minZoom: 4.5,
  maxZoom: 12,
  attributionControl: { compact: true, customAttribution: 'SoilGrids 2.0 (ISRIC), TreeMap 2023 (USFS), CEC; layers CC BY-NC 4.0' },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
for (const [name, lon, lat] of PLACES) {
  const el = document.createElement('div');
  el.className = 'place';
  el.textContent = name;
  new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat([lon, lat]).addTo(map);
}

let current = 'soil-ph';
function show(name) {
  current = name;
  const spec = LAYERS[name];
  if (map.getLayer('data')) map.removeLayer('data');
  if (map.getSource('data')) map.removeSource('data');
  map.addSource('data', { type: 'raster', tiles: [`pnw://${name}/{z}/{x}/{y}`], tileSize: 256,
    minzoom: 5, maxzoom: 9, bounds: [-125, 40, -111, 49] });
  map.addLayer({ id: 'data', type: 'raster', source: 'data',
    paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } }, 'lines');
  const stops = Array.from({ length: 9 }, (_, k) => `rgb(${colour(k / 8).join(',')}) ${k * 12.5}%`);
  document.getElementById('bar').style.background = `linear-gradient(to right, ${stops.join(', ')})`;
  document.getElementById('lo').textContent = spec.lo;
  document.getElementById('hi').textContent = spec.hi;
  document.getElementById('unit').textContent = spec.unit;
  document.getElementById('key-pending').hidden = !spec.pending;
  document.getElementById('key-thin').hidden = !spec.thin;
  document.getElementById('about').textContent = spec.about;
  // The guide shows the entry for the layer on screen first.
  const entries = document.getElementById('guide-entries');
  for (const el of entries.querySelectorAll('.guide-entry')) el.classList.toggle('active', el.dataset.layer === name);
  entries.prepend(entries.querySelector(`.guide-entry[data-layer="${name}"]`));
  document.getElementById('readout').textContent = 'Tap the map to read the value at a spot.';
  document.body.dataset.layer = name;
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
  if (!v || v.alpha === 0) out.textContent = `No data here (${where}).`;
  else if (spec.pending && v.grey === 255) out.textContent = `Canada: not computed yet, waits for the Canadian tree data (${where}).`;
  else if (spec.pending && v.grey === 254) out.textContent = `Not computed yet (${where}).`;
  else out.textContent = `${spec.fmt(spec.decode(v.grey))} (${where}).`;
});

map.on('load', () => {
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
