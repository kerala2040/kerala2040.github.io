// Privacy-conscious links: assignment tells you whose link was sent, NOT who physically clicked.
// Store only a user-entered intended-recipient label and hourly counts; never log IP,
// referrer, user agent, email address, browser fingerprint or individual event timestamps.
export const ASSIGNED_TOKEN_PATTERN = /^\/p\/([0-9a-f]{64})$/;
export const LINK_LIFETIME_DAYS = 90;
export const LINK_RETENTION_DAYS = 120;
const DESTINATION = "https://kerala2040.github.io/?utm_source=sldc_outreach&utm_medium=email&utm_campaign=historical_data_request";
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
function iso(timestamp) { return new Date(timestamp).toISOString(); }
function hour(timestamp) { return iso(timestamp).slice(0, 13) + ":00:00Z"; }
function addDays(timestamp, days) { return iso(timestamp + days * 86400000); }
export function markedAsPrefetch(request) {
  const values = ["purpose", "sec-purpose", "x-purpose", "x-moz"]
    .map(key => request.headers.get(key) || "").join(" ");
  return /prefetch|prerender|preview/i.test(values);
}
export async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function generateToken() {
  const values = new Uint8Array(32);
  crypto.getRandomValues(values);
  return [...values].map(x => x.toString(16).padStart(2, "0")).join("");
}
function respondJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
export async function createAssignedLink(request, env, now = Date.now()) {
  if (!env.DB) return respondJson({error: "D1 database has not been configured"}, 503);
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return respondJson({error: "Use application/json"}, 415);
  }
  const size = Number(request.headers.get("Content-Length") || "0");
  if (size > 2048) return respondJson({error: "Request body too large"}, 413);
  let data;
  try {
    const text = await request.text();
    if (text.length > 2048) return respondJson({error: "Request body too large"}, 413);
    data = JSON.parse(text);
  } catch {
    return respondJson({error: "Invalid JSON"}, 400);
  }
  if (data?.notice_acknowledged !== true) {
    return respondJson({error: "Confirm that the intended recipient will be told the link is tracked"}, 400);
  }
  const label = data?.intended_recipient_label;
  if (typeof label !== "string" || !label.trim() || label.length > 96) {
    return respondJson({error: "Provide an intended recipient label up to 96 characters"}, 400);
  }
  if (!/^[\p{L}\p{N}\p{M} .,()@&_'/-]+$/u.test(label)) {
    return respondJson({error: "Unsupported characters in recipient label"}, 400);
  }
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const createdAt = iso(now);
  const expiresAt = addDays(now, LINK_LIFETIME_DAYS);
  try {
    await env.DB.prepare(
      "INSERT INTO assigned_links (token_hash, recipient_label, created_utc, expires_utc, last_alert_utc) " +
      "VALUES (?1, ?2, ?3, ?4, NULL)"
    ).bind(tokenHash, label.trim(), createdAt, expiresAt).run();
  } catch {
    return respondJson({error: "Could not create the link"}, 503);
  }
  const link = new URL("/p/" + token, request.url).href;
  return respondJson({
    link, label: label.trim(), created_utc: createdAt, expires_utc: expiresAt,
    warning: "This link identifies its intended recipient, not the actual visitor. A bot or forwarded link can trigger it. Do not attribute a click to a person without confirmation."
  }, 201);
}
async function deliverAlert(env, label, time) {
  if (!env.EMAIL || !env.ALERT_FROM_EMAIL || !env.ALERT_TO_EMAIL) return;
  await env.EMAIL.send({
    from: env.ALERT_FROM_EMAIL,
    to: env.ALERT_TO_EMAIL,
    subject: "Kerala2040: assigned outreach link requested",
    text: [
      "A Kerala2040 outreach link was requested.",
      "",
      "Link assigned to: " + label,
      "UTC request hour: " + hour(time),
      "",
      "This does NOT confirm who opened it. Email security scanners, forwarding,",
      "shared devices and automated GET requests can produce false positives.",
      "No visitor IP addresses, browser fingerprints or email identities were collected.",
      "Alerts for the same link are limited to one per 24 hours.",
      "",
      "View your private link insights dashboard for aggregate counts."
    ].join("\n")
  });
}
async function accountForRequest(env, row, request, time) {
  if (!env.DB) return;
  const prefetch = markedAsPrefetch(request);
  await env.DB.prepare(
    "INSERT INTO assigned_hourly (token_hash, hour_utc, requests, suspected_prefetch) VALUES (?1, ?2, 1, ?3) " +
    "ON CONFLICT(token_hash, hour_utc) DO UPDATE SET requests = requests + 1, " +
    "suspected_prefetch = suspected_prefetch + excluded.suspected_prefetch"
  ).bind(row.token_hash, hour(time), prefetch ? 1 : 0).run();
  if (prefetch || !env.EMAIL || !env.ALERT_FROM_EMAIL || !env.ALERT_TO_EMAIL) return;
  // Compare-and-swap protects against several concurrent requests producing alert storms.
  const cutoff = iso(time - ALERT_COOLDOWN_MS);
  const changed = await env.DB.prepare(
    "UPDATE assigned_links SET last_alert_utc = ?1 " +
    "WHERE token_hash = ?2 AND (last_alert_utc IS NULL OR last_alert_utc <= ?3) " +
    "RETURNING token_hash"
  ).bind(iso(time), row.token_hash, cutoff).all();
  if (!changed?.results?.length) return;
  try {
    await deliverAlert(env, row.recipient_label, time);
  } catch (e) {
    // The redirect should work even if Cloudflare Email Service is not yet provisioned.
    // Clear this throttle only if it is still ours; retry on a later human-like request.
    await env.DB.prepare(
      "UPDATE assigned_links SET last_alert_utc = NULL WHERE token_hash = ?1 AND last_alert_utc = ?2"
    ).bind(row.token_hash, iso(time)).run().catch(() => {});
    console.error("Email notification delivery failed:", e?.code || "unknown error");
  }
}
export async function redirectAssigned(request, env, ctx, token, now = Date.now()) {
  if (!env.DB) return respondJson({error: "Tracking database not configured"}, 503);
  const digest = await hashToken(token);
  let row;
  try {
    row = await env.DB.prepare(
      "SELECT token_hash, recipient_label, expires_utc FROM assigned_links WHERE token_hash = ?1"
    ).bind(digest).first();
  } catch {
    return respondJson({error: "Database unavailable"}, 503);
  }
  if (!row) return respondJson({error: "Unknown link"}, 404);
  if (request.method !== "HEAD" && request.method !== "GET") {
    return respondJson({error: "Method not allowed"}, 405);
  }
  if (request.method === "GET" && row.expires_utc > iso(now)) {
    const write = accountForRequest(env, row, request, now).catch(() => {});
    if (ctx?.waitUntil) ctx.waitUntil(write);
    else await write;
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: DESTINATION, "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
export async function assignedStats(env, days, now = Date.now()) {
  const since = hour(now - days * 86400000);
  const counts = await env.DB.prepare(
    "SELECT l.recipient_label, l.created_utc, l.expires_utc, " +
    "COALESCE(SUM(h.requests),0) AS requests, " +
    "COALESCE(SUM(h.suspected_prefetch),0) AS suspected_prefetch " +
    "FROM assigned_links l LEFT JOIN assigned_hourly h ON h.token_hash=l.token_hash AND h.hour_utc >= ?1 " +
    "GROUP BY l.token_hash ORDER BY l.created_utc DESC LIMIT 100"
  ).bind(since).all();
  return {
    period_days: days,
    attribution_warning: "Each label names the intended recipient of a link, never the actual person who clicked.",
    recipients: counts.results.map(row => ({
      intended_recipient_label: String(row.recipient_label),
      created_utc: String(row.created_utc),
      expires_utc: String(row.expires_utc),
      requests: Number(row.requests),
      suspected_prefetch: Number(row.suspected_prefetch)
    }))
  };
}
export async function cleanOldAssigned(env, now = Date.now()) {
  if (!env.DB) return;
  await env.DB.prepare(
    "DELETE FROM assigned_hourly WHERE hour_utc < ?1"
  ).bind(hour(now - LINK_LIFETIME_DAYS * 86400000)).run();
  await env.DB.prepare(
    "DELETE FROM assigned_links WHERE expires_utc < ?1"
  ).bind(addDays(now, -LINK_RETENTION_DAYS)).run();
}
