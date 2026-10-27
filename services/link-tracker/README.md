# Kerala2040 link tracker (optional prototype — not deployed)

The original Kerala2040 research website and Gmail SLDC/KSEBL draft have NOT been changed. No working public tracking link or outgoing alert exists yet.

## Purpose and limitations

- Cloudflare Worker + D1 counts requests to a redirect URL.
- A shared campaign URL records totals only; it does not identify recipients.
- A unique assigned link records which intended recipient received it, NOT which person opened it. Forwarding, spam filters, security scans and shared devices can cause false positives.
- Optional notifications to the research owner's verified personal Gmail identify the recipient label and explicitly warn that attribution is unconfirmed.
- Application stores no visitor IP, email address, referrer, user agent, cookie or browser fingerprint. Random assigned-link tokens are stored only as SHA-256 hashes; counts are aggregated hourly.
- Identified prefetch requests do not send alerts, but security scanners frequently look like ordinary visits. Alerts have one-per-24h-per-link throttling.
- Assigned links and counts are set to expire on a 90-day schedule. Recipients should be told if a personalized link is tracked.

## Recommendation for the first SLDC email

One normal To plus two CC recipients and a direct project URL is preferable for a collegial initial engineering enquiry. For separate intended-recipient labels, you must send three separately addressed emails, each with a different tracking link and clear disclosure. Such a label still does not prove who clicked or read the email.

## Cloudflare deployment prerequisites

1. A Cloudflare account and permissions for Workers + D1. Node 22 or later.
2. An actual custom domain under your Cloudflare account if you need Cloudflare Email Service; github.io is not your DNS domain and cannot be used as the sender.
3. A verified personal Gmail destination and onboarded email-sending domain. Official instructions: https://developers.cloudflare.com/email-service/get-started/send-emails/ and https://developers.cloudflare.com/email-service/configuration/send-bindings/ .
4. A secret ADMIN_TOKEN of at least 24 random characters. Never put tokens, email credentials or API keys in Git.

### Commands to run locally (not yet executed in a Cloudflare account)

    cd services/link-tracker
    npm install
    npm test
    npx wrangler login
    npx wrangler d1 create kerala2040-link-events

Copy wrangler.example.jsonc to the ignored wrangler.jsonc and replace the placeholder database_id with the D1 UUID returned above. If the email service is not onboarded, remove the send_email binding until it is ready.

    npx wrangler d1 migrations apply kerala2040-link-events --remote --config wrangler.jsonc
    npx wrangler secret put ADMIN_TOKEN --config wrangler.jsonc

To enable alert emails, verify your personal Gmail destination in Cloudflare, configure a restricted EMAIL binding for that destination and an authenticated sender from your onboarded domain. Then set the secrets ALERT_TO_EMAIL and ALERT_FROM_EMAIL using wrangler secret put. Do not use the personal Gmail as an unverified From address.

    npx wrangler secret put ALERT_TO_EMAIL --config wrangler.jsonc
    npx wrangler secret put ALERT_FROM_EMAIL --config wrangler.jsonc
    npx wrangler deploy --config wrangler.jsonc

No public Worker hostname can be asserted until deployed. Visit the actual Worker hostname at /health or /dashboard after deployment.

## Endpoints

| Route | Purpose |
| --- | --- |
| GET /health | Public service health |
| GET /r/sldc-historical-2026 | Shared, aggregate-only campaign redirect |
| GET /p/{random-64-hex-token} | Individual assigned-link redirect, NOT an identity sensor |
| GET /dashboard | Public HTML shell; no stats unless bearer-token authenticated |
| GET /api/stats?days=30 | Admin-only generic hourly statistics |
| GET /api/assigned-links?days=30 | Admin-only assigned-link counts and labels |
| POST /api/assigned-links | Admin-only creation, body includes intended_recipient_label and notice_acknowledged=true |

The browser dashboard stores the administrator secret only in the browser tab's memory, with no cookies or local storage. Assigned URL tokens are displayed once and cannot be recovered after creation.

## Operational safety

Email scanners can generate alerts even when the intended human never touched a link. A GET request is not a verified email open or proof of interest. Avoid reporting that a named official clicked. Keep a clear recipient notice when using individually tracked links. Keep alert email sender/recipient credentials in Cloudflare secrets. The app does not modify scientific results or release private SLDC data.

Current status remains SOURCE-CODE PROTOTYPE. No personal Gmail message or research outreach email has been sent.
