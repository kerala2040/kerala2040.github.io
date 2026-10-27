import assert from "node:assert/strict";
import test from "node:test";
import {createAssignedLink, redirectAssigned, assignedStats, hashToken} from "./personal-links.mjs";
import worker from "./index.mjs";

class FakeD1 {
  constructor() {
    this.links = new Map();
    this.hourly = new Map();
  }
  prepare(sql) {
    const db = this;
    return {
      bind(...a) {
        return {
          async run() {
            if (sql.startsWith("INSERT INTO assigned_links")) {
              db.links.set(a[0], {token_hash:a[0], recipient_label:a[1], created_utc:a[2], expires_utc:a[3], last_alert_utc:null});
            } else if (sql.startsWith("INSERT INTO assigned_hourly")) {
              const key = a[0] + "|" + a[1];
              const old = db.hourly.get(key) || {token_hash:a[0], hour_utc:a[1], requests:0, suspected_prefetch:0};
              old.requests++;
              old.suspected_prefetch+=a[2];
              db.hourly.set(key,old);
            } else if (sql.startsWith("UPDATE assigned_links SET last_alert_utc = NULL")) {
              const row = db.links.get(a[0]);
              if (row && row.last_alert_utc === a[1]) row.last_alert_utc = null;
            } else if (sql.startsWith("DELETE FROM assigned_hourly")) {
              for (const [key,v] of db.hourly) if(v.hour_utc < a[0]) db.hourly.delete(key);
            } else if (sql.startsWith("DELETE FROM assigned_links")) {
              for (const [key,v] of db.links) if(v.expires_utc < a[0]) db.links.delete(key);
            } else { throw new Error("Unexpected run query: " + sql); }
            return {success:true};
          },
          async first() {
            if (sql.startsWith("SELECT token_hash")) return db.links.get(a[0]) || null;
            throw new Error("Unexpected first query");
          },
          async all() {
            if (sql.startsWith("UPDATE assigned_links SET last_alert_utc = ?1")) {
              const row=db.links.get(a[1]);
              if (!row || (row.last_alert_utc!==null && row.last_alert_utc > a[2])) return {results:[]};
              row.last_alert_utc=a[0];
              return {results:[{token_hash:a[1]}]};
            }
            if (sql.startsWith("SELECT l.recipient_label")) {
              const rows=[...db.links.values()].map(link=>{
                const values=[...db.hourly.values()].filter(v=>v.token_hash===link.token_hash&&v.hour_utc>=a[0]);
                return {...link,requests:values.reduce((n,v)=>n+v.requests,0),
                  suspected_prefetch:values.reduce((n,v)=>n+v.suspected_prefetch,0)};
              });
              return {results:rows};
            }
            throw new Error("Unexpected all query: "+sql);
          }
        };
      }
    };
  }
}
const today=Date.UTC(2026,9,27,12,0,0);
function requestCreate(label="SLDC Chief Engineer",ack=true){
  return new Request("https://links.test/api/assigned-links",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({intended_recipient_label:label,notice_acknowledged:ack})
  });
}
function environment() {
  const emails=[];
  return {
    DB:new FakeD1(),
    ADMIN_TOKEN:"a_secure_32_byte_token_used_for_tests_only",
    ALERT_FROM_EMAIL:"alerts@example.org",
    ALERT_TO_EMAIL:"personal@example.org",
    EMAIL:{ async send(msg){emails.push(msg);return {messageId:"test-email"}}},
    emails
  };
}
function context(){
  const tasks=[];
  return {waitUntil(p){tasks.push(p)},async finish(){await Promise.all(tasks)}};
}
test("assigned-link creation requires acknowledgement and validates labels",async()=>{
  const env=environment();
  const bad=await createAssignedLink(requestCreate("SLDC",false),env,today);
  assert.equal(bad.status,400);
  const weird=await createAssignedLink(requestCreate("<img src=x>"),env,today);
  assert.equal(weird.status,400);
  assert.equal(env.DB.links.size,0);
});
test("independently generated links are opaque and store only their hashes",async()=>{
  const env=environment();
  const a=await createAssignedLink(requestCreate("SLDC Chief Engineer"),env,today);
  const b=await createAssignedLink(requestCreate("SLDC Deputy Chief Engineer"),env,today);
  assert.equal(a.status,201);
  const first=await a.json(),second=await b.json();
  assert.notEqual(first.link,second.link);
  const token=first.link.split("/p/")[1];
  assert.match(token,/^[a-f0-9]{64}$/);
  assert.equal(env.DB.links.has(await hashToken(token)),true);
  assert.equal(env.DB.links.has(token),false);
  assert.match(first.warning,/not the actual visitor/i);
});
test("GET increments hourly aggregate and notifies assigned recipient label, not a claimed visitor",async()=>{
  const env=environment();
  const r=await createAssignedLink(requestCreate(),env,today);
  const {link}=await r.json();
  const ctx=context();
  const redirect=await redirectAssigned(new Request(link),env,ctx,link.split("/p/")[1],today);
  assert.equal(redirect.status,302);
  assert.equal(redirect.headers.get("Location").startsWith("https://kerala2040.github.io/"),true);
  await ctx.finish();
  assert.equal(env.emails.length,1);
  assert.match(env.emails[0].text,/Link assigned to: SLDC Chief Engineer/);
  assert.match(env.emails[0].text,/does NOT confirm who opened it/i);
  const stats=await assignedStats(env,30,today);
  assert.equal(stats.recipients.length,1);
  assert.equal(stats.recipients[0].requests,1);
  assert.equal(stats.recipients[0].suspected_prefetch,0);
  // Repeated click in same alert period still counts but does not send another email.
  const ctx2=context();
  await redirectAssigned(new Request(link),env,ctx2,link.split("/p/")[1],today+3000);
  await ctx2.finish();
  assert.equal(env.emails.length,1);
  const next=context();
  await redirectAssigned(new Request(link),env,next,link.split("/p/")[1],today+86400001);
  await next.finish();
  assert.equal(env.emails.length,2);
});
test("HEAD and explicit prefetch do not send alerts",async()=>{
  const env=environment();
  const {link}=await (await createAssignedLink(requestCreate(),env,today)).json();
  const token=link.split("/p/")[1];
  const ctx=context();
  await redirectAssigned(new Request(link,{method:"HEAD"}),env,ctx,token,today);
  await ctx.finish();
  const other=context();
  await redirectAssigned(new Request(link,{headers:{Purpose:"prefetch"}}),env,other,token,today);
  await other.finish();
  assert.equal(env.emails.length,0);
  const stats=await assignedStats(env,30,today);
  assert.equal(stats.recipients[0].requests,1);
  assert.equal(stats.recipients[0].suspected_prefetch,1);
});
test("expired links still redirect but do not collect clicks or email",async()=>{
  const env=environment();
  const {link}=await (await createAssignedLink(requestCreate(),env,today)).json();
  const ctx=context();
  const r=await redirectAssigned(new Request(link),env,ctx,link.split("/p/")[1],today+91*86400000);
  await ctx.finish();
  assert.equal(r.status,302);
  assert.equal(env.emails.length,0);
  assert.equal(env.DB.hourly.size,0);
});
test("worker protects admin endpoint and never treats a common campaign URL as identity",async()=>{
  const env=environment();
  const denied=await worker.fetch(new Request("https://links.test/api/assigned-links"),env);
  assert.equal(denied.status,401);
  const accepted=await worker.fetch(
    new Request("https://links.test/api/assigned-links",{headers:{Authorization:"Bearer "+env.ADMIN_TOKEN}}),env
  );
  assert.equal(accepted.status,200);
  const data=await accepted.json();
  assert.deepEqual(data.recipients,[]);
  const generic=await worker.fetch(new Request("https://links.test/r/sldc-historical-2026",{method:"HEAD"}),env);
  assert.equal(generic.status,302);
  assert.equal(env.emails.length,0);
});
