# PostPilot source upload status

The full PostPilot application source is now present on the `main` branch. No manual source upload is needed.

- Repository: https://github.com/ManikandanP24/PostPilot
- Render app: https://postpilot-dx6r.onrender.com
- Render setup: [RENDER_DEPLOY.md](./RENDER_DEPLOY.md)

Before using authentication or social publishing, configure the required Supabase, Meta, and LinkedIn credentials in Render and run `supabase/schema.sql` in Supabase SQL Editor. Scheduled publishing also needs a Render Cron Job or another recurring scheduler calling the protected `/api/cron/publish` endpoint.
