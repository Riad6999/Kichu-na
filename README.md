# Luxury Date Proposal — Vercel-ready

This repository contains a small front-end + Vercel API routes for a "luxury romantic" date proposal site.

## Quick summary
- One-time password (in-memory): **lovemeone**
- WhatsApp number used for redirects/sharing: **+966502681629**

> Note: This implementation uses in-memory state (ephemeral). If Vercel instances restart or scale, in-memory state may reset. For persistent one-time behavior use a DB or Vercel KV / Upstash Redis integration.

## How to deploy (GitHub -> Vercel)
1. Push this repo to GitHub.
2. In Vercel, import the GitHub repo and set environment variables (optional):
   - ONE_TIME_PASS (defaults to 'lovemeone' if not set)
   - WHATSAPP_NUMBER (defaults to '966502681629' if not set)
3. Deploy. Static files in `public/` will be served from Vercel CDN; `api/` contains serverless endpoints.

## Files of interest
- `public/` — frontend (index.html, yes.html, styles, script)
- `api/` — validate-pass, report-no, status (serverless functions)
- `vercel.json` — optional routing/build config

## Notes
- To add background music, place `bg-music.mp3` into `public/` and uncomment the <source> tag in `yes.html`.
- For robust persistence of used passwords or blocked IPs, integrate a database or KV store.
