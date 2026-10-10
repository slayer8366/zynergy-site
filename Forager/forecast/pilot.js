// Sighting chance (pilot): one layer on the forecast test area (Forager RECORD -814, -817).
//
// Reads two static files, written by the forager-forecast pilot's scoring step and copied here
// unchanged (the data contract from forager-forecast D55/D56):
//   data/pnw-pilot/current/manifest.json        published_at, groups[], week, attribution,
//                                                pilot, validated, reviewed, beats_calendar, ...
//   data/pnw-pilot/current/cantharellus.geojson  one 0.1 degree weather cell per feature, with
//                                                chance, uncertainty_low/high, applicable,
//                                                drivers, weather_through, model_version
// The week folder the scoring step writes (pnw-pilot/<week>/) is copied to "current/", so the
// page never needs to know the week in advance; the week it shows comes from the manifest.
//
// Promises kept here (D55, D12): the number is called sighting chance and nothing else, and is
// shown only beside its reference class; a cell that is not scored, or has applicable false, is
// drawn as nothing and the legend says "no forecast here"; the attribution strings are shown on
// the map. The banner is built from the manifest only, and says "not stated" where a field is
// missing rather than assuming a value.

const BASE = 'data/pnw-pilot/current/';
const GROUP_FILE = 'cantharellus.geojson';

// Fixed classes, the same every week, so a colour means the same chance from one week to the next.
// Colours from the viridis ramp the page's other layers use, low to high.
export const CLASSES = [
  { from: 0.0, to: 0.05, label: 'under 5%', rgb: 'rgb(68,1,84)' },
  { from: 0.05, to: 0.10, label: '5 to 10%', rgb: 'rgb(65,68,135)' },
  { from: 0.10, to: 0.20, label: '10 to 20%', rgb: 'rgb(42,120,142)' },
  { from: 0.20, to: 0.30, label: '20 to 30%', rgb: 'rgb(34,168,132)' },
  { from: 0.30, to: 0.50, label: '30 to 50%', rgb: 'rgb(122,209,81)' },
  { from: 0.50, to: 1.01, label: '50% or more', rgb: 'rgb(253,231,37)' },
];

// A cell is drawn only when applicable is true and chance is a number from 0 to 1.
const DRAWN = ['all',
  ['==', ['get', 'applicable'], true],
  ['==', ['typeof', ['get', 'chance']], 'number'],
  ['>=', ['get', 'chance'], 0],
  ['<=', ['get', 'chance'], 1],
];

function fillColour() {
  const expr = ['step', ['get', 'chance'], CLASSES[0].rgb];
  for (const c of CLASSES.slice(1)) expr.push(c.from, c.rgb);
  return expr;
}

function pct(v) {
  if (v < 0.01 && v > 0) return 'under 1%';
  return `${Math.round(v * 100)}%`;
}

function isDrawn(p) {
  return p.applicable === true && typeof p.chance === 'number' && p.chance >= 0 && p.chance <= 1;
}

async function fetchJson(path) {
  // no-cache: revalidate with the server each time, so a newly dropped-in week is not hidden
  // behind the hour-long cache _headers gives everything under data/.
  const resp = await fetch(new URL(path, location.href).href, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`${path}: HTTP ${resp.status}`);
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    // A missing file on this site returns the home page with status 200 (README), not a 404.
    throw new Error(`${path}: not JSON (${text.slice(0, 40).replace(/\s+/g, ' ')}...)`);
  }
}

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function yesNo(v, yes, no, field) {
  if (v === true) return yes;
  if (v === false) return no;
  return `${field}: not stated in the manifest.`;
}

function calendarLine(v) {
  if (v === true) return 'It beat the seasonal calendar on held-out years.';
  if (v === false) return 'It did not beat the seasonal calendar on held-out years: the calendar alone did as well or better. It is shown anyway, as a pilot.';
  if (v === null) return 'Whether it beats the seasonal calendar on held-out years: not known yet.';
  return 'Whether it beats the seasonal calendar: not stated in the manifest.';
}

function asText(v) {
  if (v == null) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export function createPilot(map, maplibregl) {
  const state = { loaded: false, loading: null, error: null, manifest: null, featureCount: 0, drawnCount: 0,
    weekMismatch: 0, lastTap: null, selectedId: null, on: false };
  window.pnwPilot = state; // for checks

  const banner = document.getElementById('pilot-banner');
  const readout = document.getElementById('readout');

  function groupName(key) {
    const g = (state.manifest && Array.isArray(state.manifest.groups))
      ? state.manifest.groups.find((x) => x.key === key) : null;
    return g && g.display_name ? g.display_name : key;
  }

  function renderBanner() {
    banner.replaceChildren();
    if (state.error) {
      banner.append(el('p', `The pilot's sighting chance could not be loaded, so nothing is drawn. (${state.error})`, 'pilot-head'));
      return;
    }
    if (!state.manifest) {
      banner.append(el('p', 'Loading the pilot model and its labels...', 'pilot-head'));
      return;
    }
    const m = state.manifest;
    const head = [
      yesNo(m.pilot, 'Pilot model.', 'The manifest says this is not a pilot.', 'Pilot'),
      yesNo(m.validated, 'Validated.', 'Not validated.', 'Validated'),
      yesNo(m.reviewed, 'Reviewed.', 'Not reviewed.', 'Reviewed'),
      'Not the forecast.',
    ].join(' ');
    banner.append(el('p', head, 'pilot-head'));
    banner.append(el('p', calendarLine(m.beats_calendar)));
    const meta = [];
    meta.push(m.week ? `Week of ${m.week}.` : 'Week: not stated in the manifest.');
    const versions = new Set(state.versions || []);
    if (versions.size) meta.push(`Model: ${[...versions].join(', ')}.`);
    if (m.published_at) meta.push(`Published ${m.published_at}.`);
    banner.append(el('p', meta.join(' '), 'pilot-meta'));
    if (state.weekMismatch) {
      banner.append(el('p', `${state.weekMismatch} cells carry a week other than the manifest's.`, 'pilot-meta'));
    }
    const t1 = asText(m.t1_result);
    if (t1) banner.append(el('p', `Test result: ${t1}`, 'pilot-meta'));
    const wb = asText(m.weather_bridge);
    if (wb) banner.append(el('p', `Weather: ${wb}`, 'pilot-meta'));
    const attr = Array.isArray(m.attribution) ? m.attribution : (m.attribution ? [m.attribution] : []);
    if (attr.length) {
      const p = el('p', null, 'pilot-attr');
      p.append(el('span', 'Data: '));
      p.append(document.createTextNode(attr.map(asText).join(' ')));
      banner.append(p);
    } else {
      banner.append(el('p', 'Attribution: not stated in the manifest.', 'pilot-attr'));
    }
  }

  async function load() {
    try {
      const [manifest, cells] = await Promise.all([fetchJson(BASE + 'manifest.json'), fetchJson(BASE + GROUP_FILE)]);
      if (!cells || cells.type !== 'FeatureCollection' || !Array.isArray(cells.features)) {
        throw new Error(`${GROUP_FILE}: not a GeoJSON FeatureCollection`);
      }
      state.manifest = manifest;
      state.featureCount = cells.features.length;
      state.drawnCount = cells.features.filter((f) => f.properties && isDrawn(f.properties)).length;
      state.versions = [...new Set(cells.features.map((f) => f.properties && f.properties.model_version).filter(Boolean))];
      state.weekMismatch = manifest.week
        ? cells.features.filter((f) => f.properties && f.properties.week !== manifest.week).length : 0;
      if (state.weekMismatch) console.warn(`pilot: ${state.weekMismatch} cells carry a week other than the manifest's ${manifest.week}`);
      map.addSource('pilot', { type: 'geojson', data: cells, generateId: true,
        attribution: (Array.isArray(manifest.attribution) ? manifest.attribution.map(asText).join(' ') : asText(manifest.attribution)) || '' });
      map.addLayer({ id: 'pilot-fill', type: 'fill', source: 'pilot', filter: DRAWN,
        layout: { visibility: 'none' },
        paint: { 'fill-color': fillColour(), 'fill-opacity': 0.85, 'fill-antialias': false } }, 'lines');
      map.addLayer({ id: 'pilot-selected', type: 'line', source: 'pilot', filter: DRAWN,
        layout: { visibility: 'none' },
        paint: { 'line-color': '#000', 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0] } });
      state.loaded = true;
    } catch (err) {
      state.error = String(err.message || err);
      console.error('pilot load failed', err);
      (window.pnwErrors || []).push(state.error);
    }
    renderBanner();
    if (state.on) setVisible(true);
  }

  function setVisible(on) {
    for (const id of ['pilot-fill', 'pilot-selected']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    }
  }

  function select(id) {
    if (state.selectedId != null) map.setFeatureState({ source: 'pilot', id: state.selectedId }, { selected: false });
    state.selectedId = id;
    if (id != null) map.setFeatureState({ source: 'pilot', id }, { selected: true });
  }

  function describe(p) {
    readout.replaceChildren();
    const name = groupName(p.group);
    readout.append(el('p', `Sighting chance: ${pct(p.chance)}`, 'pilot-chance'));
    readout.append(el('p', `The chance ${name.toLowerCase()} are reported in this cell this week, given someone reported any fungus here.`));
    const lo = p.uncertainty_low, hi = p.uncertainty_high;
    if (typeof lo === 'number' && typeof hi === 'number') readout.append(el('p', `Uncertainty: ${pct(lo)} to ${pct(hi)}.`));
    else readout.append(el('p', 'Uncertainty: not given for this cell.'));
    readout.append(el('p', p.weather_through ? `Weather through ${p.weather_through}.` : 'Weather date: not given for this cell.'));
    if (Array.isArray(p.drivers) && p.drivers.length) {
      readout.append(el('p', 'What moved it, largest first:'));
      const ul = el('ul');
      for (const d of p.drivers) ul.append(el('li', `${asText(d.label)}: ${asText(d.value)}`));
      readout.append(ul);
    }
  }

  function onClick(e) {
    if (!state.on) return;
    const where = `${e.lngLat.lat.toFixed(3)} N, ${(-e.lngLat.lng).toFixed(3)} W`;
    if (!state.loaded) {
      readout.textContent = state.error ? 'The pilot layer did not load; there is nothing to read.' : 'Still loading the pilot layer.';
      return;
    }
    const hits = map.queryRenderedFeatures(e.point, { layers: ['pilot-fill'] });
    if (!hits.length) {
      select(null);
      state.lastTap = { lng: e.lngLat.lng, lat: e.lngLat.lat, chance: null };
      readout.textContent = `No forecast here: this cell is not scored, or the model does not apply to it (${where}).`;
      return;
    }
    const f = hits[0];
    select(f.id);
    state.lastTap = { lng: e.lngLat.lng, lat: e.lngLat.lat, ...f.properties };
    // MapLibre hands nested properties back as JSON strings.
    const p = { ...f.properties };
    if (typeof p.drivers === 'string') {
      try { p.drivers = JSON.parse(p.drivers); } catch { p.drivers = []; }
    }
    describe(p);
    readout.append(el('p', `(${where})`, 'pilot-where'));
  }
  map.on('click', onClick);
  map.on('mouseenter', 'pilot-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'pilot-fill', () => { map.getCanvas().style.cursor = ''; });

  return {
    show() {
      state.on = true;
      banner.hidden = false;
      renderBanner();
      if (!state.loading) state.loading = load();
      setVisible(true);
      readout.textContent = 'Tap a cell to read its sighting chance.';
    },
    hide() {
      state.on = false;
      banner.hidden = true;
      setVisible(false);
      if (state.loaded) select(null);
    },
  };
}
