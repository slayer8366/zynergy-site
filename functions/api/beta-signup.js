// POST /api/beta-signup: closed. Answers 410 Gone and stores nothing.
//
// Forager is on Google Play, so the beta sign-up is switched off (owner, 2026-10-21, dispatch
// 2026-10-21-05). /beta-signup/ redirects to the Play listing (_redirects), and this endpoint
// refuses every submission without touching BETA_DB: no row, no rate-limit entry, no mail.
//
// The list that was collected stays exactly as it is in the `zynergy-site-beta` D1 database,
// and /api/beta-export still serves it to the export token holder. What happens to the list
// is the owner's open decision.
//
// A sign-up page still open in someone's browser from before the change has no message for
// `signup_closed`, so it shows its generic fallback: "That did not go through (error 410).
// Please try again, or email support@zynergy-labs.com." Nothing is recorded either way.
//
// The working sign-up handler (validation, honeypot, Turnstile, rate limit, D1 insert,
// Resend notification) is in git history at df15222 if the form is ever reopened. It was
// removed rather than left in place behind a switch, so no path in this file can write.

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.zynergylabs.forager.app';

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } });
  }
  if (method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'POST, OPTIONS' });
  }
  return json(
    {
      ok: false,
      error: 'signup_closed',
      message: 'The Forager beta sign-up is closed. Forager is available on Google Play.',
      play_url: PLAY_URL,
    },
    410
  );
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
