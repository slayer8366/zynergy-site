// POST /api/beta-signup — records one address on the Forager beta list and notifies support@.
//
// Cloudflare Pages Function. Bindings and variables it reads:
//
//   BETA_DB           (D1 binding, required)   database `zynergy-beta`, schema in db/schema.sql
//   RESEND_API_KEY    (secret, required to mail)
//   BETA_NOTIFY_TO    (var, optional)          default support@zynergy-labs.com
//   BETA_NOTIFY_FROM  (var, optional)          default Forager Beta <beta@mail.zynergy-labs.com>
//   TURNSTILE_SECRET  (secret, optional)       when absent the Turnstile check is skipped, loudly
//   RATE_LIMIT_SALT   (secret, optional)       when absent a constant salt is used, loudly
//
// The store is authoritative and the mail is a notification, in that order: the row is
// written first, so a mail outage costs a notification rather than a signup. Which of the
// two happened is recorded on the row (`notified_at` / `notify_error`) and shown in the
// CSV from /api/beta-export, so a send that failed is visible rather than assumed.

const DEFAULT_NOTIFY_TO = 'support@zynergy-labs.com';
const DEFAULT_NOTIFY_FROM = 'Forager Beta <beta@mail.zynergy-labs.com>';

// Deliberately permissive: one @, something either side, a dot in the domain. A stricter
// regex rejects addresses that are in fact deliverable, and the only check that actually
// proves an address works is mailing it.
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

const LIMITS = {
  email: 254,          // RFC 5321 maximum path length
  name: 120,
  device: 120,
  androidVersion: 40,
  note: 2000,
};

const RATE_LIMIT_MAX = 5;                    // signups per window, per caller
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // one hour

export async function onRequest(context) {
  if (context.request.method === 'POST') return handleSignup(context);
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } });
  }
  return json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'POST, OPTIONS' });
}

async function handleSignup(context) {
  const { request, env } = context;

  if (!env.BETA_DB) {
    // An unconfigured binding is reported as unconfigured. Returning a cheerful 200 here
    // would tell someone they had joined a list that does not exist.
    console.error('beta-signup: BETA_DB binding is missing; cannot record signups');
    return json({ ok: false, error: 'signup_unavailable' }, 503);
  }

  let body;
  try {
    body = await readBody(request);
  } catch (err) {
    console.warn('beta-signup: unreadable body:', String(err));
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Honeypot. The field is present in the form, positioned off-screen and marked
  // aria-hidden + tabindex="-1", so a person never reaches it and a naive bot fills it.
  if (str(body.website)) {
    console.log('beta-signup: honeypot filled, dropping submission');
    return json({ ok: true, status: 'recorded', notified: false }, 200);
  }

  const email = str(body.email);
  if (!email) return json({ ok: false, error: 'email_required', field: 'email' }, 400);
  if (email.length > LIMITS.email || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'email_invalid', field: 'email' }, 400);
  }
  if (!truthy(body.consent)) {
    return json({ ok: false, error: 'consent_required', field: 'consent' }, 400);
  }

  const turnstile = await verifyTurnstile(env, str(body['cf-turnstile-response']), clientIp(request));
  if (!turnstile.ok) {
    return json({ ok: false, error: 'challenge_failed', field: 'turnstile' }, 403);
  }

  const rate = await checkRateLimit(env, clientIp(request));
  if (!rate.allowed) {
    return json({ ok: false, error: 'rate_limited', retry_after_seconds: rate.retryAfter }, 429, {
      'retry-after': String(rate.retryAfter),
    });
  }

  const row = {
    email,
    email_norm: email.trim().toLowerCase(),
    name: clip(str(body.name), LIMITS.name),
    device: clip(str(body.device), LIMITS.device),
    android_version: clip(str(body.android_version), LIMITS.androidVersion),
    note: clip(str(body.note), LIMITS.note),
    country: request.cf && request.cf.country ? String(request.cf.country) : null,
    created_at: new Date().toISOString(),
  };

  let inserted;
  try {
    // RETURNING gives a row only when the INSERT actually happened, so a duplicate is
    // distinguished by the presence of a result rather than by a driver's row count.
    const created = await env.BETA_DB.prepare(
      `INSERT INTO beta_signups
         (email, email_norm, name, device, android_version, note, country, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'web', ?)
       ON CONFLICT(email_norm) DO NOTHING
       RETURNING id`
    )
      .bind(
        row.email, row.email_norm, row.name, row.device,
        row.android_version, row.note, row.country, row.created_at
      )
      .first();
    inserted = created != null;
  } catch (err) {
    console.error('beta-signup: D1 insert failed:', String(err));
    return json({ ok: false, error: 'signup_failed' }, 500);
  }

  if (!inserted) {
    // Already on the list. Say so rather than sending support a second copy of the
    // same person, and rather than claiming a new signup that did not happen.
    return json({ ok: true, status: 'already_on_list', notified: false }, 200);
  }

  const notify = await sendNotification(env, row);
  try {
    await env.BETA_DB.prepare(
      `UPDATE beta_signups SET notified_at = ?, notify_error = ? WHERE email_norm = ?`
    )
      .bind(notify.ok ? new Date().toISOString() : null, notify.ok ? null : notify.error, row.email_norm)
      .run();
  } catch (err) {
    // The signup is safe; only the record of the mail's outcome is not.
    console.error('beta-signup: could not record notification outcome:', String(err));
  }

  if (!notify.ok) {
    // The address deliberately stays out of the log line. Which signup this was is
    // answerable from the export, where the row carries its own notify_error, and a
    // request log is the wrong place to keep a list of people's email addresses.
    console.error(`beta-signup: signup recorded but notification failed: ${notify.error}`);
  }

  return json({ ok: true, status: 'recorded', notified: notify.ok }, 200);
}

async function sendNotification(env, row) {
  const to = env.BETA_NOTIFY_TO || DEFAULT_NOTIFY_TO;
  const from = env.BETA_NOTIFY_FROM || DEFAULT_NOTIFY_FROM;

  if (!env.RESEND_API_KEY) {
    console.error('beta-signup: RESEND_API_KEY is not set; no notification sent');
    return { ok: false, error: 'mailer_not_configured' };
  }

  const lines = [
    `Email:    ${row.email}`,
    `Name:     ${row.name || '—'}`,
    `Device:   ${row.device || '—'}`,
    `Android:  ${row.android_version || '—'}`,
    `Country:  ${row.country || '—'}`,
    `Received: ${row.created_at}`,
    '',
    'Note:',
    row.note || '(none)',
    '',
    '—',
    'Recorded in the zynergy-beta D1 database. The full list is at',
    'GET /api/beta-export with the export bearer token.',
  ];

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: row.email, // so replying from support@ reaches the person directly
        subject: `Forager beta signup: ${row.email}`,
        text: lines.join('\n'),
      }),
    });

    if (!response.ok) {
      const detail = clip((await response.text()).replace(/\s+/g, ' '), 300);
      return { ok: false, error: `mailer_http_${response.status}: ${detail}` };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: clip(`mailer_exception: ${String(err)}`, 300) };
  }
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) {
    // A skipped check is announced. Silence here would read, in the logs, exactly like
    // a check that ran and passed.
    console.warn('beta-signup: TURNSTILE_SECRET not set; bot check skipped for this request');
    return { ok: true, skipped: true };
  }
  if (!token) return { ok: false, skipped: false };

  try {
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const outcome = await response.json();
    return { ok: outcome.success === true, skipped: false };
  } catch (err) {
    // Fail closed: a challenge that could not be checked has not been passed.
    console.error('beta-signup: Turnstile verification error:', String(err));
    return { ok: false, skipped: false };
  }
}

async function checkRateLimit(env, ip) {
  if (!ip) return { allowed: true, retryAfter: 0 };

  const salt = env.RATE_LIMIT_SALT;
  if (!salt) {
    console.warn('beta-signup: RATE_LIMIT_SALT not set; using the built-in constant salt');
  }
  const ipHash = await sha256Hex(`${salt || 'zynergy-beta-default-salt'}:${ip}`);
  const now = Date.now();

  try {
    const existing = await env.BETA_DB.prepare(
      `SELECT hits, window_start FROM beta_rate_limit WHERE ip_hash = ?`
    ).bind(ipHash).first();

    const windowStart = existing ? Date.parse(existing.window_start) : NaN;
    const inWindow = Number.isFinite(windowStart) && now - windowStart < RATE_LIMIT_WINDOW_MS;

    if (inWindow && existing.hits >= RATE_LIMIT_MAX) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000)),
      };
    }

    if (inWindow) {
      await env.BETA_DB.prepare(
        `UPDATE beta_rate_limit SET hits = hits + 1 WHERE ip_hash = ?`
      ).bind(ipHash).run();
    } else {
      await env.BETA_DB.prepare(
        `INSERT INTO beta_rate_limit (ip_hash, hits, window_start) VALUES (?, 1, ?)
         ON CONFLICT(ip_hash) DO UPDATE SET hits = 1, window_start = excluded.window_start`
      ).bind(ipHash, new Date(now).toISOString()).run();
    }
    return { allowed: true, retryAfter: 0 };
  } catch (err) {
    // Let the signup through, but say in the log that the limit was not enforced, so a
    // quiet flood is not mistaken for a working limiter.
    console.error('beta-signup: rate-limit check failed, allowing request:', String(err));
    return { allowed: true, retryAfter: 0 };
  }
}

async function readBody(request) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) {
    return await request.json();
  }
  if (type.includes('form-urlencoded') || type.includes('multipart/form-data')) {
    return Object.fromEntries(await request.formData());
  }
  throw new Error(`unsupported content-type: ${type || '(none)'}`);
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || '';
}

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clip(value, max) {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function truthy(value) {
  const v = str(value).toLowerCase();
  return value === true || v === 'on' || v === 'true' || v === 'yes' || v === '1';
}

function json(payload, status, extraHeaders) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(extraHeaders || {}),
    },
  });
}
