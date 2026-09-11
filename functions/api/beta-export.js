// GET /api/beta-export: the whole beta list, for whoever holds the export token.
//
//   curl -H "authorization: Bearer $EXPORT_TOKEN" https://zynergy-labs.com/api/beta-export
//   curl -H "authorization: Bearer $EXPORT_TOKEN" 'https://zynergy-labs.com/api/beta-export?format=json'
//
// This exists because the mail to support@ is a notification and notifications are lost:
// a provider outage, a spam filter, a mistyped forwarding rule. The database holds the
// list either way, and this is how it comes back out. `notified_at` and `notify_error`
// are in the output for the same reason: a row that never reached support@ is visible
// here as a row that never reached support@.
//
// Bindings and variables:
//   BETA_DB       (D1 binding, required)
//   EXPORT_TOKEN  (secret, required)  when unset the endpoint refuses rather than opening

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return text('method not allowed\n', 405, { allow: 'GET' });
  }

  if (!env.EXPORT_TOKEN) {
    console.error('beta-export: EXPORT_TOKEN is not set; refusing to serve the list');
    return text('export is not configured\n', 503);
  }
  if (!env.BETA_DB) {
    console.error('beta-export: BETA_DB binding is missing');
    return text('export is not configured\n', 503);
  }

  const url = new URL(request.url);
  const presented =
    bearer(request.headers.get('authorization')) || url.searchParams.get('token') || '';

  if (!timingSafeEqual(presented, env.EXPORT_TOKEN)) {
    return text('unauthorized\n', 401, { 'www-authenticate': 'Bearer' });
  }

  let rows;
  try {
    const result = await env.BETA_DB.prepare(
      `SELECT id, email, name, device, android_version, note, country,
              source, created_at, notified_at, notify_error
         FROM beta_signups
        ORDER BY id`
    ).all();
    rows = result.results || [];
  } catch (err) {
    console.error('beta-export: query failed:', String(err));
    return text('export failed\n', 500);
  }

  if (url.searchParams.get('format') === 'json') {
    return new Response(JSON.stringify({ count: rows.length, signups: rows }, null, 2), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const columns = [
    'id', 'email', 'name', 'device', 'android_version', 'note',
    'country', 'source', 'created_at', 'notified_at', 'notify_error',
  ];
  const csv = [
    columns.join(','),
    ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(',')),
  ].join('\n') + '\n';

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="forager-beta-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}

function bearer(header) {
  if (!header) return '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
}

// Compares in time independent of where the first difference falls. The length is not
// hidden, which is fine: the token's length is not the secret.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  // Quote anything a spreadsheet would otherwise misread, and double any embedded quote.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function text(body, status, extraHeaders) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      ...(extraHeaders || {}),
    },
  });
}
