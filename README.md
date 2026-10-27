# PostPilot

**Create once. Publish everywhere.** PostPilot is a Next.js App Router app for creating, previewing, scheduling and tracking posts for Instagram, Facebook Pages and LinkedIn from one workspace.

## Project structure

- `src/app/dashboard/` — dashboard, composer, history, calendar and settings UI
- `src/app/api/` — OAuth callbacks, media upload/rendering, post CRUD/retry, and scheduled publishing
- `src/lib/publishing/dispatcher.ts` — server-side Meta and LinkedIn publishing
- `supabase/schema.sql` — workspace, social accounts, posts, per-platform targets, media and row-level security
- `public/` — PWA manifest, service worker and icons
- `render.yaml` — Render Blueprint

## Local setup

Requirements: Node.js 20/22, npm, and a Supabase project.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Generate a 32-byte token encryption key using `openssl rand -hex 32` and place it in `ENCRYPTION_KEY`. Never commit `.env.local` or service credentials.

## Supabase setup

1. Create a Supabase project.
2. Set the URL, anon/publishable key, and service-role key in `.env.local`.
3. Run `supabase/schema.sql` in **Supabase Dashboard → SQL Editor**.
4. Configure Auth URL settings and allow `http://localhost:3000/auth/callback` for local development. Add the Render callback later after deployment.

## Official social APIs

### Meta: Instagram and Facebook Pages

1. Create a developer app at https://developers.facebook.com/ and configure the login / Instagram publishing product matching your use case.
2. Add `http://localhost:3000/api/oauth/meta/callback` as the OAuth redirect URL locally.
3. Set `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, and `META_GRAPH_API_VERSION`.
4. Use an Instagram Business or Creator account linked to a Facebook Page. The app requests page and Instagram publishing scopes. App review / advanced access may be needed for accounts outside developer/test roles.
5. Connect under PostPilot **Settings**. This starter chooses the first accessible Page automatically; confirm your intended Page before production.

Official guide: https://developers.facebook.com/docs/instagram-platform/content-publishing/

### LinkedIn

1. Create an app at https://www.linkedin.com/developers/.
2. Add `http://localhost:3000/api/oauth/linkedin/callback` as an OAuth redirect.
3. Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, and a currently supported `LINKEDIN_VERSION`.
4. Enable the required sign-in / share product and ensure `w_member_social` access is approved for the account.
5. Connect under PostPilot **Settings**. This starter publishes to a member profile; organization/Page publishing is not implemented.

References: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api and https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access

## Environment variables

Copy every variable in `.env.example` into your host's environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_SECRET`, `LINKEDIN_CLIENT_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET` secret and server-only. Platform credentials are encrypted before storing them in Supabase.

## Deploy to Render

1. Push this repository to GitHub.
2. In https://render.com select **New + → Blueprint** and connect `ManikandanP24/PostPilot`.
3. Apply the Blueprint in `render.yaml` and fill all `sync: false` variables with your real credentials.
4. After the first deploy, update `NEXT_PUBLIC_APP_URL` to your Render HTTPS URL. Update Meta/LinkedIn redirect URIs to `/api/oauth/meta/callback` and `/api/oauth/linkedin/callback` on that host.
5. Add both provider callback URLs to their app consoles, and add `https://YOUR_RENDER_HOST/auth/callback` in Supabase Auth redirect allow-list. Redeploy after updating environment values.
6. Run `supabase/schema.sql` in Supabase SQL Editor if not already done.

See [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for details.

### Scheduled posts on Render

`vercel.json` only configures Vercel Cron; Render does not run it. Create a separate Render Cron Job or an external scheduler to request `GET /api/cron/publish` with `Authorization: Bearer <CRON_SECRET>` at a cadence supported by your Render plan. Test the route and post history before relying on production schedules.

### FFmpeg / Reels

The Add music flow uses `ffmpeg-static` to render a short vertical MP4 from an uploaded image and an MP3 the user has rights to publish. Verify the FFmpeg binary works on the deployed host with a short test before enabling production use.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

The PWA is installable on supported browsers over HTTPS or localhost. Offline publishing is intentionally unsupported. The included in-memory rate limiter is basic single-instance protection and should be replaced with a shared Redis/Upstash limiter before high-volume production use.
