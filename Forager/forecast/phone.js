// Phones (760 px wide or less): the controls in a panel that peeks up from the bottom of the map
// (owner, Forager RECORD -908). Desktop is untouched: below the breakpoint this file only adds
// classes and listeners that the phone CSS in index.html reads, and above it the handle is
// hidden and the panel is the ordinary side column.
//
// Peek: the handle (with the layer's name), the legend and the see-through slider, plus the
// readout once the map has been tapped. Open: everything (layer list, legend, slider, readout,
// guide). The handle opens and closes by a tap, Enter or Space (it is a button), or a drag: up
// opens, down returns to the peek. Choosing a layer returns the panel to the peek, so the new
// layer can be seen at once (a coder's call, reported with the change).
//
// The panel is positioned by its own height at the bottom of the map's box: nothing it draws, and
// no box of its own, sits over the map above its top edge, so touches there reach the map
// (Forager CLAUDE.md's rule on full-width layers that catch touches, applied here in spirit).

const PHONE = window.matchMedia('(max-width: 760px)');
// Whether the phone layout is on is read from the CSS itself (the panel is positioned over the map
// only there), not from a separate media test that a browser could answer differently from its
// own stylesheet (RECORD -912). The media test only tells us when to look again.
const DRAG_SLOP = 8;      // px of movement before a press on the handle counts as a drag
const DRAG_DECIDE = 30;   // px of drag that decides open or close on release

export function setUpPhonePanel(map) {
  const panel = document.getElementById('panel');
  const isPhone = () => getComputedStyle(panel).position === 'absolute';
  const handle = document.getElementById('panel-handle');
  const verb = document.getElementById('panel-handle-verb');
  const more = document.getElementById('panel-more');
  const name = document.getElementById('panel-layer-name');
  const intro = document.getElementById('intro');
  const state = { open: false };
  window.pnwPanel = state; // for checks

  function render() {
    panel.classList.toggle('open', state.open);
    panel.classList.toggle('peek', !state.open);
    handle.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    verb.textContent = state.open ? 'Close the layer panel: ' : 'Open the layer panel: ';
    more.textContent = state.open ? 'Less' : 'More';
    if (!state.open) panel.scrollTop = 0;
    publishHeight();
  }
  function setOpen(open) { state.open = open; render(); }

  // The panel's drawn height, for the map's bottom controls (the (i) credit button) to sit above it.
  // --map-free-h is the map's height left above the panel, which caps the opened credit box.
  function publishHeight() {
    const h = isPhone() ? panel.offsetHeight : 0;
    document.documentElement.style.setProperty('--panel-h', `${h}px`);
    document.documentElement.style.setProperty('--map-free-h', `${Math.max(0, panel.parentElement.clientHeight - h)}px`);
  }
  const sizes = new ResizeObserver(publishHeight);
  sizes.observe(panel);
  sizes.observe(panel.parentElement);

  function layerName() {
    const checked = document.querySelector('#layers input:checked');
    return checked ? checked.parentElement.textContent.trim() : '';
  }

  // Tap, Enter and Space all arrive as a click on the button; a drag suppresses the click after it.
  let suppressClick = false;
  handle.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    setOpen(!state.open);
  });

  let drag = null;
  handle.addEventListener('pointerdown', (e) => {
    if (!isPhone() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, y0: e.clientY, h0: panel.offsetHeight, moved: false };
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(dy) < DRAG_SLOP) return;
    drag.moved = true;
    // Follow the finger between the peek and the open height.
    const max = panel.parentElement.clientHeight * 0.85;
    panel.style.top = 'auto';
    panel.style.maxHeight = 'none';
    panel.style.height = `${Math.max(48, Math.min(max, drag.h0 - dy))}px`;
  });
  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    const moved = drag.moved;
    drag = null;
    panel.style.top = '';
    panel.style.maxHeight = '';
    panel.style.height = '';
    if (!moved) return; // a tap: the click that follows toggles
    suppressClick = true;
    // A click may not follow a drag; clear the flag on the next tick so a later tap still works.
    setTimeout(() => { suppressClick = false; }, 0);
    if (cancelled) { render(); return; }
    if (dy <= -DRAG_DECIDE) setOpen(true);
    else if (dy >= DRAG_DECIDE) setOpen(false);
    else render();
  }
  handle.addEventListener('pointerup', (e) => endDrag(e, false));
  handle.addEventListener('pointercancel', (e) => endDrag(e, true));

  // The readout joins the peek after a map tap; a layer change clears it (app.js and pilot.js
  // reset its text then) and returns the panel to the peek.
  map.on('click', () => panel.classList.add('has-readout'));
  document.getElementById('layers').addEventListener('change', () => {
    panel.classList.remove('has-readout');
    name.textContent = layerName();
    if (isPhone() && state.open) setOpen(false);
  });

  // The intro: one line on a phone, opened and closed by a tap, Enter or Space.
  function introToggle() {
    if (!isPhone()) return;
    const open = intro.classList.toggle('open');
    intro.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  intro.addEventListener('click', introToggle);
  intro.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); introToggle(); }
  });

  function applyBreakpoint() {
    const phone = isPhone();
    handle.hidden = !phone;
    if (phone) {
      intro.setAttribute('role', 'button');
      intro.setAttribute('tabindex', '0');
      intro.setAttribute('aria-expanded', intro.classList.contains('open') ? 'true' : 'false');
      render();
    } else {
      panel.classList.remove('open', 'peek');
      intro.classList.remove('open');
      for (const a of ['role', 'tabindex', 'aria-expanded']) intro.removeAttribute(a);
      publishHeight();
    }
  }
  PHONE.addEventListener('change', applyBreakpoint);
  // The window's height in px, the fallback for browsers without dynamic viewport units.
  function publishAppHeight() {
    document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
  }
  let wasPhone = isPhone();
  window.addEventListener('resize', () => {
    publishAppHeight();
    if (isPhone() !== wasPhone) { wasPhone = isPhone(); applyBreakpoint(); }
  });
  publishAppHeight();
  name.textContent = layerName();
  applyBreakpoint();
  return state;
}
