# SnapCal Content Security Policy (CSP) Guide

API responses already set CSP headers via `@fastify/helmet`. Static frontends
(mobile/admin) are served by nginx and should also emit strict headers.

## Current backend CSP (API)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' data: https://*.snapcal.health https://telegram.org;
connect-src 'self' <MOBILE_APP_URL> <ADMIN_APP_URL> <AI_AGENT_URL>;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

The API returns JSON only, so `script-src 'self'` is safe. Remove
`unsafe-inline` from `script-src` whenever possible.

## SPA (mobile/admin) CSP

If you inline scripts/styles in `index.html`, use a nonce:

1. Generate nonce per request in nginx:
   ```nginx
   set_secure_random_alphanum $cspNonce 32;
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-$cspNonce'; ..." always;
   sub_filter_once off;
   sub_filter 'NONCE_PLACEHOLDER' $cspNonce;
   ```

2. Replace `<script nonce="NONCE_PLACEHOLDER">` in your `index.html`.

## Telegram WebView

Telegram WebView opens `https://snapcal.health` inside an iframe-ish context.
The `connect-src` must allow `https://*.snapcal.health` and the API origin.
`frame-ancestors 'none'` protects the app from being embedded on non-Telegram
sites; Telegram WebView does not rely on `frame-ancestors`.

## Reporting

Add a CSP report-uri or `report-to` endpoint to collect violations:

```
report-uri /api/csp-report;
```

Then implement `POST /api/csp-report` to log to your security monitoring.

## HSTS

All public domains serve `Strict-Transport-Security: max-age=31536000;
includeSubDomains; preload`. Submit domains to
https://hstspreload.org/ after verifying full HTTPS.
