// Runs ahead of every request to the site.
//
// Two jobs:
//
//  1. Keep the repository's own source out of the published site. Cloudflare Pages
//     publishes the build output directory, which for this project is the repository
//     root, so `functions/` and `db/` are candidates for being served as ordinary
//     files. Whether they actually are depends on how Pages treats the functions
//     directory for a given project, which is not something this repo can assert from
//     the outside, so block the paths rather than depend on the answer. Verified
//     locally: without this, GET /functions/api/beta-signup.js returned the source
//     with content-type application/javascript.
//
//  2. Set the headers that are the same for every page. Content-Security-Policy keeps
//     'unsafe-inline' because both pages carry inline <style> and the signup page an
//     inline <script>; the directives that do the real work here are frame-ancestors,
//     object-src and form-action, none of which inline content weakens.

const BLOCKED_PREFIXES = ['/functions/', '/db/'];

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Byte ranges for the forecast test area's PMTiles archives (Forager/forecast/data/*.pmtiles).
// A PMTiles reader asks for small byte ranges, and the static asset server answered a Range
// request with the whole file as 200 (checked on the preview, 2026-10-09), which the reader
// rejects. Scoped to that folder only; every other path is served exactly as before.
const RANGED_PREFIX = '/Forager/forecast/data/';

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start, end;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0) return 'unsatisfiable';
    start = Math.max(size - n, 0);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || end < start) return 'unsatisfiable';
  return { start, end };
}

function sliceStream(body, start, end) {
  let pos = 0;
  const reader = body.getReader();
  return new ReadableStream({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        const from = pos;
        pos += value.length;
        if (pos <= start) continue;
        const a = Math.max(start - from, 0);
        const b = Math.min(end + 1 - from, value.length);
        controller.enqueue(value.subarray(a, b));
        if (pos > end) { controller.close(); reader.cancel(); }
        return;
      }
    },
    cancel() { reader.cancel(); },
  });
}

async function servePmtilesRange(context) {
  const range = context.request.headers.get('range');
  const response = await context.next();
  if (!range || response.status !== 200 || !response.body) return response;
  // The asset response inside a Function carries no Content-Length (seen on the preview), so
  // the archive is read once to learn its size; known, the range is streamed instead.
  const declared = response.headers.get('content-length');
  let bytes = null;
  let size = declared === null ? NaN : Number(declared);
  if (!Number.isFinite(size) || size <= 0) {
    bytes = new Uint8Array(await response.arrayBuffer());
    size = bytes.length;
  }
  const r = parseRange(range, size);
  const headers = new Headers(response.headers);
  headers.set('accept-ranges', 'bytes');
  if (r === null) {
    return bytes ? new Response(bytes, { status: 200, headers }) : response;
  }
  if (r === 'unsatisfiable') {
    if (!bytes) response.body.cancel();
    headers.set('content-range', `bytes */${size}`);
    headers.delete('content-length');
    return new Response(null, { status: 416, headers });
  }
  headers.set('content-range', `bytes ${r.start}-${r.end}/${size}`);
  headers.set('content-length', String(r.end - r.start + 1));
  const body = bytes ? bytes.slice(r.start, r.end + 1)
    : sliceStream(response.body, r.start, r.end);
  return new Response(body, { status: 206, headers });
}

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;

  if (BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const response = path.startsWith(RANGED_PREFIX) && path.endsWith('.pmtiles')
    ? await servePmtilesRange(context)
    : await context.next();
  const headers = new Headers(response.headers);

  headers.set('content-security-policy', CSP);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'geolocation=(), camera=(), microphone=(), interest-cohort=()');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
