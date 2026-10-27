// No visitor IP, identity, user-agent string, cookies or referrer data are retained.
// The link redirect works even if database logging fails.
const CAMPAIGNS = Object.freeze({
  "sldc-historical-2026": "https://kerala2040.github.io/?utm_source=sldc_outreach&utm_medium=email&utm_campaign=historical_data_request"
});
const DASHBOARD_HTML = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"robots\" content=\"noindex,nofollow\"><title>Kerala2040 · Link insights</title>\n<style>\n:root{color-scheme:dark;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0d1420;color:#edf4fa}\n*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:clamp(20px,4vw,64px)}\nmain{max-width:900px;margin:0 auto}.eyebrow{color:#70c5df;letter-spacing:.12em;text-transform:uppercase;font-size:.75rem;font-weight:700}\nh1{font-size:clamp(1.8rem,4vw,2.7rem);margin:.3em 0 .2em}p{color:#9bb0c1;line-height:1.55}\n.panel{background:#152236;border:1px solid #2e3f57;border-radius:16px;padding:24px;margin-top:26px}\nform{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 6px}input,select,button{border:1px solid #405674;border-radius:8px;background:#0d1828;color:#f2f5fa;padding:12px 14px;font:inherit}\ninput{flex:1;min-width:235px}button{background:#3aa7ca;color:#092033;font-weight:700;border-color:#3aa7ca;cursor:pointer}button:hover{background:#80c9dc}\n.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:16px}\n.metric{border:1px solid #40506b;border-radius:12px;padding:18px}.metric strong{font-size:2rem;display:block}.metric span{color:#abbac7;font-size:.86rem}\ntable{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:11px 8px;border-bottom:1px solid #34435a;text-align:left}th{color:#b8cbdb;font-weight:600}\nsmall{color:#96aabd}#error{color:#ffc5b9}a{color:#93d6ef}footer{margin:28px 0;color:#90a4b9;font-size:.9rem}\n</style></head><body><main><div class=\"eyebrow\">Kerala2040 / Research outreach</div>\n<h1>Link insights</h1><p>Aggregated redirect requests. This dashboard does not identify visitors or prove that an email recipient opened or read a message.</p>\n<section class=\"panel\"><h2>Private access</h2>\n<p>Enter the administrator token set as a Cloudflare Worker secret. It stays in this browser tab's memory and is not saved to storage or sent in a URL.</p>\n<form id=\"auth-form\"><input id=\"token\" type=\"password\" autocomplete=\"off\" placeholder=\"Admin access token\" required minlength=\"24\">\n<select id=\"days\" aria-label=\"Report period\"><option value=\"7\">Last 7 days</option><option value=\"30\" selected>Last 30 days</option><option value=\"90\">Last 90 days</option></select>\n<button type=\"submit\">View stats</button></form><p id=\"error\" role=\"status\"></p>\n</section>\n<section id=\"results\" class=\"panel\" hidden><h2>Request counts</h2><div id=\"summary\" class=\"grid\"></div>\n<p><small>“Other” excludes requests explicitly marked as prefetch/preview but can still include security scanners. No IP, person, email address, browser fingerprint, or per-recipient token is collected.</small></p>\n<h3>Recent hourly activity</h3><table><thead><tr><th>UTC hour</th><th>Campaign</th><th>Requests</th><th>Suspected prefetch</th></tr></thead><tbody id=\"hourly\"></tbody></table></section>\n<footer>Privacy by design · no cookies · no IP retention in the application · 90-day retention · <a href=\"https://kerala2040.github.io/\">Kerala2040</a></footer></main>\n<script>\nconst form=document.getElementById('auth-form'), results=document.getElementById('results'), error=document.getElementById('error');\nfunction el(tag,text,className){const item=document.createElement(tag);item.textContent=String(text);if(className)item.className=className;return item}\nform.addEventListener('submit',async event=>{\nevent.preventDefault();error.textContent='';results.hidden=true;\nconst token=document.getElementById('token').value;\nconst days=document.getElementById('days').value;\ntry {\n  const response=await fetch('/api/stats?days='+encodeURIComponent(days),{headers:{Authorization:'Bearer '+token},cache:'no-store'});\n  if(!response.ok)throw new Error(response.status===401?'Incorrect token.':'Could not load statistics ('+response.status+').');\n  const data=await response.json();\n  const s=document.getElementById('summary');s.replaceChildren();\n  const totals=data.campaigns.reduce((a,c)=>({requests:a.requests+c.total_requests,prefetch:a.prefetch+c.suspected_prefetch}),{requests:0,prefetch:0});\n  for(const [label,value] of [['Total requests',totals.requests],['Suspected prefetch',totals.prefetch],['Other requests',Math.max(0,totals.requests-totals.prefetch)],['Campaigns',data.campaigns.length]]){\n    const card=el('div','','metric');card.append(el('strong',value),el('span',label));s.append(card);\n  }\n  const t=document.getElementById('hourly');t.replaceChildren();\n  for(const row of data.hourly){\n    const tr=document.createElement('tr');for(const cell of [row.hour_utc,row.slug,row.requests,row.suspected_prefetch])tr.append(el('td',cell));t.append(tr);\n  }\n  if(!data.hourly.length){const tr=document.createElement('tr');const td=el('td','No requests yet.');td.colSpan=4;tr.append(td);t.append(tr)}\n  results.hidden=false;\n}catch(e){error.textContent=e.message}\n});\n</script></body></html>";
const MIN_TOKEN_LENGTH = 24;
const RETENTION_DAYS = 90;

function responseHeaders(type) {
  return {
    "Content-Type": type,
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow"
  };
}
function json(value, status = 200, other = {}) {
  return new Response(JSON.stringify(value), {
    status, headers: {...responseHeaders("application/json; charset=utf-8"), ...other}
  });
}
function redirect(destination) {
  return new Response(null, {
    status: 302,
    headers: {...responseHeaders("text/plain; charset=utf-8"), Location: destination}
  });
}
function isPrefetch(request) {
  const header = ["purpose", "sec-purpose", "x-purpose", "x-moz"]
    .map(name => request.headers.get(name) || "").join(" ");
  // Transient detection only: never store these headers.
  return /prefetch|prerender|preview/i.test(header);
}
function tokenMatches(actual, expected) {
  // No credentials in query strings. Length-independent bytewise comparison.
  if (!expected || expected.length < MIN_TOKEN_LENGTH) return false;
  const a = new TextEncoder().encode(actual);
  const b = new TextEncoder().encode(expected);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    difference |= (a[i] || 0) ^ (b[i] || 0);
  }
  return difference === 0;
}
function utcHour(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 13) + ":00:00Z";
}
async function writeClick(env, slug, request, when) {
  if (!env.DB) return;
  await env.DB.prepare(
    "INSERT INTO hourly_clicks (slug, hour_utc, requests, suspected_prefetch) " +
    "VALUES (?1, ?2, 1, ?3) ON CONFLICT(slug, hour_utc) DO UPDATE SET " +
    "requests = requests + 1, suspected_prefetch = suspected_prefetch + excluded.suspected_prefetch"
  ).bind(slug, utcHour(when), isPrefetch(request) ? 1 : 0).run();
}
async function getStats(env, days, now) {
  const since = utcHour(now - days * 86400000);
  const totals = await env.DB.prepare(
    "SELECT slug, SUM(requests) AS total_requests, " +
    "SUM(suspected_prefetch) AS suspected_prefetch " +
    "FROM hourly_clicks WHERE hour_utc >= ?1 GROUP BY slug ORDER BY slug"
  ).bind(since).all();
  const recent = await env.DB.prepare(
    "SELECT slug, hour_utc, requests, suspected_prefetch FROM hourly_clicks " +
    "WHERE hour_utc >= ?1 ORDER BY hour_utc DESC, slug LIMIT 5000"
  ).bind(since).all();
  return {
    period_days: days,
    since_utc: since,
    limitations: "Counts are redirect requests, not verified human visits or identified people. Security scanners can issue GET requests.",
    campaigns: totals.results.map(row => ({
      slug: String(row.slug),
      total_requests: Number(row.total_requests),
      suspected_prefetch: Number(row.suspected_prefetch)
    })),
    hourly: recent.results.map(row => ({
      slug: String(row.slug), hour_utc: String(row.hour_utc),
      requests: Number(row.requests), suspected_prefetch: Number(row.suspected_prefetch)
    }))
  };
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === "/health" && request.method === "GET") return json({ok: true, service: "kerala2040-links"});
    if (pathname === "/dashboard" && request.method === "GET") {
      return new Response(DASHBOARD_HTML, {
        headers: {...responseHeaders("text/html; charset=utf-8"),
          "Content-Security-Policy": "default-src 'none'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}
      });
    }
    if (pathname === "/api/stats") {
      if (request.method !== "GET") return json({error: "Method not allowed"}, 405, {Allow: "GET"});
      if (!env.DB || !env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < MIN_TOKEN_LENGTH) return json({error: "Not configured"}, 503);
      const authorization = request.headers.get("Authorization") || "";
      if (!tokenMatches(authorization.startsWith("Bearer ") ? authorization.slice(7) : "", env.ADMIN_TOKEN)) {
        return json({error: "Unauthorized"}, 401, {"WWW-Authenticate": "Bearer"});
      }
      const rawDays = url.searchParams.get("days") || "30";
      const days = Number(rawDays);
      if (![7, 30, 90].includes(days) || !/^(7|30|90)$/.test(rawDays)) return json({error: "Use days=7, 30 or 90"}, 400);
      try { return json(await getStats(env, days, Date.now())); }
      catch { return json({error: "Database unavailable"}, 503); }
    }
    const match = /^\/r\/([a-z0-9-]{1,64})$/.exec(pathname);
    if (match && Object.prototype.hasOwnProperty.call(CAMPAIGNS, match[1])) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({error: "Method not allowed"}, 405, {Allow: "GET, HEAD"});
      }
      // HEAD does not increment the counter. GET may still be a security scanner.
      if (request.method === "GET") {
        const operation = writeClick(env, match[1], request, Date.now())
          .catch(() => { /* Never prevent recipient from reaching the real website. */ });
        if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(operation);
        else await operation;
      }
      return redirect(CAMPAIGNS[match[1]]);
    }
    return json({error: "Not found"}, 404);
  },
  async scheduled(event, env) {
    if (!env.DB) return;
    const cutoff = utcHour(Date.now() - RETENTION_DAYS * 86400000);
    await env.DB.prepare("DELETE FROM hourly_clicks WHERE hour_utc < ?1").bind(cutoff).run();
  }
};
