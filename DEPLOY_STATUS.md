# PostPilot deployment status

Updated 2026-10-27.

- **GitHub source:** the application source is present on `main` at https://github.com/ManikandanP24/PostPilot.
- **Render service:** deployed and live at https://postpilot-dx6r.onrender.com.
- **Render dashboard:** https://dashboard.render.com/web/srv-dbgag5uc6qcc73ermofg.
- **Database:** run `supabase/schema.sql` in your Supabase project.
- **Required secrets:** add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_ID`, `META_APP_SECRET`, `LINKEDIN_CLIENT_ID`, and `LINKEDIN_CLIENT_SECRET` in Render's Environment settings. OAuth callback URLs are already set to the Render host; make the same URLs match in the Meta and LinkedIn developer consoles.
- **Scheduler:** the web endpoint is implemented, but a recurring Render Cron Job has not yet been created. Render Cron Jobs have a $1/month minimum plus runtime usage; obtain approval before adding this paid resource.

The production build has passed on Render. Social posting is not fully operational until the external credentials are provided and account permissions approved.
