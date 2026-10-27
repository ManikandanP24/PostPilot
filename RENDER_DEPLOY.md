# Deploy PostPilot to Render

This repository includes `render.yaml` as a Render Blueprint.

## Deploy
1. Sign in to https://render.com and choose **New + → Blueprint**.
2. Connect GitHub and select `ManikandanP24/PostPilot`.
3. Review the `postpilot` service and choose **Apply**. Render requests the environment variables marked `sync: false`.
4. After the first deploy, copy the Render HTTPS URL into `NEXT_PUBLIC_APP_URL`.
5. Set `META_REDIRECT_URI` to `https://YOUR_RENDER_HOST/api/oauth/meta/callback` and `LINKEDIN_REDIRECT_URI` to `https://YOUR_RENDER_HOST/api/oauth/linkedin/callback`.
6. Add those callback URLs to Meta/LinkedIn app settings and add `https://YOUR_RENDER_HOST/auth/callback` to Supabase Auth's redirect allow-list.
7. In Supabase SQL Editor, run `supabase/schema.sql`.

## Secrets
Fill Supabase, Meta, LinkedIn and encryption values from `.env.example` in Render's Environment screen. Generate `ENCRYPTION_KEY` with `openssl rand -hex 32`. Never commit secrets. Render generates `CRON_SECRET` from the blueprint.

## Scheduled publishing
This Blueprint deploys the web service only. `vercel.json` cron is not run by Render. Create a separate Render Cron Job or use an external scheduler to call `GET /api/cron/publish` at the chosen cadence with `Authorization: Bearer <CRON_SECRET>`. Test that the cadence is supported by the selected Render plan.

## Media processing
The FFmpeg Reel-rendering endpoint depends on a compatible FFmpeg binary. Test a short sample Reel on Render before production. Instagram requires the media URL to be publicly reachable; Supabase storage is configured for this use case by the SQL schema.
