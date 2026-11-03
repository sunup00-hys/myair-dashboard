# myAir personal sync setup
This repository contains only the public dashboard and backend *templates*. Do not upload patient records or private keys to GitHub.

## 1. Create an isolated personal Supabase project
Do **not** reuse `diff-ax-contest` (work). Prefer a new personal project in Seoul.

## 2. Database
Run `supabase/schema.sql` in the new project's SQL editor. It enables RLS: users can read only their own records; no browser insert/update/delete is granted. The Edge Function performs writes server-side.

## 3. Authentication
In Supabase Authentication create a single personal user (email/password); confirm their email. Copy that user's UUID from Authentication > Users. Disable public signups if this is a single-user dashboard.

## 4. Edge Function
Deploy `supabase/functions/myair-ingest/index.ts` as function `myair-ingest`, with **verify_jwt=false** because the function validates its own private device key. Configure the following *server-side* secrets in the Supabase dashboard:
- `MYAIR_DEVICE_SECRET`: a random 32+ byte secret; used only in MacroDroid HTTP header, never in public GitHub or JavaScript
- `MYAIR_OWNER_USER_ID`: your personal Auth User UUID

Use Supabase-injected `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the function; do not copy either secret key into the browser or repository.

## 5. MacroDroid
After **Screen Text Read -> myAirText**, add an HTTP POST / Web Request action:
- URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/myair-ingest`
- Method: POST
- Header: `Content-Type: application/json`
- Header: `X-MyAir-Device-Key: [private device secret]`
- Body: the **entire Dictionary in JSON format** (the same expression that worked for file contents, e.g. `{lvjson=myAirText}`).
Test it while the phone is unlocked, and inspect the HTTP response; `{"ok":true,"date":"YYYY-MM-DD"}` confirms a write. Configure a daily unlock-based trigger after validating automatic capture. Never share screenshots containing the token.

## 6. Dashboard
Fill `cloud-config.js` with your personal project URL and the **public publishable key only**. The browser can sign in and read rows protected by Supabase RLS. Once a personal project exists, finish and test the cloud-login interface.

## Status
- GitHub Pages: live (local record import and charts)
- Backend SQL & Edge Function: code prepared, **not deployed**
- Auth/cloud sync: **not connected**
