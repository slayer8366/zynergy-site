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

// The forecast page's street map is drawn from our own tile server, a separate origin
// (Forager RECORD -857, -858). connect-src lets it through on the forecast page's paths only
// (the page, and its vendored map worker, whose fetches are governed by its own response's
// policy); every other page keeps connect-src 'self'. Rejected: opening it site-wide (pages
// that never draw a map would gain an origin they do not use), and passing tiles through a
// same-site function (a new function and request cost, for no gain the path rule lacks).
const TILE_SERVER = 'https://forager-pmtiles.brandonlee1-894.workers.dev';
const MAP_PATH_PREFIX = '/Forager/forecast/';

function cspFor(path) {
  const connect = path.startsWith(MAP_PATH_PREFIX) ? `connect-src 'self' ${TILE_SERVER}` : "connect-src 'self'";
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    connect,
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;

  if (BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);

  headers.set('content-security-policy', cspFor(path));
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
