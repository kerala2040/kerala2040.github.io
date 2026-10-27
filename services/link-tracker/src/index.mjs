import { ASSIGNED_TOKEN_PATTERN, createAssignedLink, redirectAssigned, assignedStats, cleanOldAssigned } from './personal-links.mjs';
// No visitor IP, identity, user-agent string, cookies or referrer data are retained.
// The link redirect works even if database logging fails.
const CAMPAIGNS = Object.freeze({
  "sldc-historical-2026": "https://kerala2040.github.io/?utm_source=sldc_outreach&utm_medium=email&utm_campaign=historical_data_request"
});
const DASHBOARD_HTML = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"robots\" content=\"noindex,nofollow\"><title>Kerala2040 · Outreach insights</title>\n<style>\n:root{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color-scheme:dark;color:#eff5fa;background:#101827}*{box-sizing:border-box}\nbody{margin:0;padding:24px 18px 50px}main{max-width:910px;margin:0 auto}h1{font-size:clamp(1.8rem,4vw,2.6rem);margin:.3em 0}.eyebrow{letter-spacing:.12em;color:#92d8ec;font-size:.75rem;text-transform:uppercase;font-weight:bold}\np,small{color:#bac9d8;line-height:1.6}.panel{background:#18263a;border:1px solid #32455d;padding:22px;border-radius:14px;margin:20px 0}\ninput,select,button{font:inherit;color:inherit;border:1px solid #516681;border-radius:8px;padding:12px;background:#101c2c}\ninput{width:100%}button{cursor:pointer;font-weight:650;background:#83cee4;color:#102337;border-color:#83cee4}\nbutton:hover{filter:brightness(1.12)}button:disabled{opacity:.6;cursor:wait}form{display:grid;gap:12px}\n.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.row>*{flex:1}.metric{padding:16px;border-radius:10px;border:1px solid #3f5770}\n.metric strong{font-size:1.65rem;display:block}.metric span{color:#b5c5d6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}\ntable{width:100%;border-collapse:collapse;font-size:.92rem}td,th{padding:11px 8px;text-align:left;border-bottom:1px solid #3d506a}\nth{color:#d4e1ed}table{overflow-wrap:anywhere}.table-scroll{overflow-x:auto}code{color:#a9f0f6;overflow-wrap:anywhere}\n#error{color:#ffc5b9}#created-link{color:#a9f0f6;overflow-wrap:anywhere}#notice{accent-color:#83cee4}\nlabel{color:#d4e1ed}a{color:#a9e0f4}footer{margin-top:35px;color:#9eb2c4}\n</style></head><body><main>\n<div class=\"eyebrow\">Kerala2040 / Outreach</div><h1>Private link insights</h1>\n<p>Use separate links for individual *intended recipients*. A click cannot establish who opened it: forwarded URLs and automated security checks also generate visits.</p>\n<section class=\"panel\"><h2>Administrator access</h2><p>The access token stays in this browser tab, not in cookies or local storage.</p>\n<form id=\"auth-form\"><label for=\"token\">Admin token</label><input id=\"token\" type=\"password\" autocomplete=\"off\" required minlength=\"24\" placeholder=\"Cloudflare Worker ADMIN_TOKEN\">\n<div class=\"row\"><select id=\"days\" aria-label=\"Reporting period\"><option value=\"7\">Past 7 days</option><option value=\"30\" selected>Past 30 days</option><option value=\"90\">Past 90 days</option></select><button type=\"submit\">Refresh counts</button></div></form><p id=\"error\" role=\"status\"></p></section>\n<section class=\"panel\"><h2>Create an assigned link</h2><p>For attribution to an intended recipient, send this link in a <strong>separate one-to-one email</strong>. A single To/CC message with one common link cannot distinguish recipients. The labels are private server-side records.</p>\n<form id=\"create-form\">\n<label for=\"label\">Recipient label, e.g. \"Chief Engineer — SLDC\"</label><input id=\"label\" maxlength=\"96\" required placeholder=\"Intended recipient's name or role\">\n<label><input id=\"notice\" type=\"checkbox\" style=\"width:auto\" required> I will disclose to the recipient that the link records outreach engagement.</label>\n<button type=\"submit\">Generate expiring link</button></form>\n<p id=\"created-link\" role=\"status\"></p><p><small>Link is valid for 90 days; alerts go only to the Gmail address configured privately in Cloudflare. Alerts are capped to one per link per 24 hours.</small></p></section>\n<section id=\"result-section\" class=\"panel\" hidden><h2>Assigned link requests</h2><div id=\"totals\" class=\"grid\"></div>\n<p><small>“Other” means no explicit prefetch indicator; it is NOT verified human activity. Labels reflect which link was sent, not who opened it.</small></p>\n<div class=\"table-scroll\"><table><thead><tr><th>Intended recipient</th><th>Requests</th><th>Suspected prefetch</th><th>Expires</th></tr></thead><tbody id=\"assigned-body\"></tbody></table></div></section>\n<footer>No IP or browser fingerprint stored. Counts aggregated by link and UTC hour, with 90-day count retention. <a href=\"https://kerala2040.github.io/\">Back to Kerala2040</a></footer>\n<script>\nconst token = document.getElementById('token');\nconst error = document.getElementById('error');\nfunction add(tag, value){const e=document.createElement(tag);e.textContent=String(value);return e}\nasync function api(path,options={}){\n const r=await fetch(path,{...options,cache:'no-store',headers:{Authorization:'Bearer '+token.value,...(options.headers||{})}});\n let v={};try{v=await r.json()}catch{}\n if(!r.ok)throw Error(v.error||'Request failed with status '+r.status);\n return v;\n}\ndocument.getElementById('auth-form').addEventListener('submit',async ev=>{\n ev.preventDefault();error.textContent='';document.getElementById('result-section').hidden=true;\n try {\n const days=document.getElementById('days').value;\n const r=await api('/api/assigned-links?days='+encodeURIComponent(days));\n const total=r.recipients.reduce((a,v)=>({requests:a.requests+v.requests,prefetch:a.prefetch+v.suspected_prefetch}),{requests:0,prefetch:0});\n const container=document.getElementById('totals');container.replaceChildren();\n for(const [label,value] of [['Requests',total.requests],['Possible scanner requests',total.prefetch],['Other requests',Math.max(0,total.requests-total.prefetch)],['Assigned links',r.recipients.length]]){\n  const d=add('div','');d.className='metric';d.append(add('strong',value),add('span',label));container.append(d);\n }\n const tbody=document.getElementById('assigned-body');tbody.replaceChildren();\n for(const v of r.recipients){\n  const tr=document.createElement('tr');\n  for(const item of [v.intended_recipient_label,v.requests,v.suspected_prefetch,v.expires_utc.slice(0,10)])tr.append(add('td',item));\n  tbody.append(tr);\n }\n if(!r.recipients.length){const tr=document.createElement('tr');const td=add('td','No assigned links created yet');td.colSpan=4;tr.append(td);tbody.append(tr)}\n document.getElementById('result-section').hidden=false;\n } catch(e){error.textContent=e.message}\n});\ndocument.getElementById('create-form').addEventListener('submit',async ev=>{\n ev.preventDefault();\n const feedback=document.getElementById('created-link');\n feedback.textContent='Creating…';\n try{\n const data=await api('/api/assigned-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({intended_recipient_label:document.getElementById('label').value,notice_acknowledged:document.getElementById('notice').checked})});\n feedback.replaceChildren(add('span','Link assigned to '+data.label+': '),add('code',data.link),add('span',' (copy it now; the private token is not stored in the dashboard)'));\n } catch(e){feedback.textContent=e.message}\n});\n</script></main></body></html>";
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
    if (pathname === "/api/assigned-links") {
      if (!["GET", "POST"].includes(request.method)) return json({error: "Method not allowed"}, 405, {Allow: "GET, POST"});
      if (!env.DB || !env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < MIN_TOKEN_LENGTH) return json({error: "Not configured"}, 503);
      const authorization = request.headers.get("Authorization") || "";
      if (!tokenMatches(authorization.startsWith("Bearer ") ? authorization.slice(7) : "", env.ADMIN_TOKEN)) {
        return json({error: "Unauthorized"}, 401, {"WWW-Authenticate": "Bearer"});
      }
      if (request.method === "POST") return createAssignedLink(request, env);
      const daysRaw = url.searchParams.get("days") || "30";
      if (!/^(7|30|90)$/.test(daysRaw)) return json({error: "Use days=7, 30 or 90"}, 400);
      try { return json(await assignedStats(env, Number(daysRaw))); }
      catch { return json({error: "Database unavailable"}, 503); }
    }
    const assigned = ASSIGNED_TOKEN_PATTERN.exec(pathname);
    if (assigned) return redirectAssigned(request, env, ctx, assigned[1]);
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
    await cleanOldAssigned(env);
  }
};
