# PostPilot upload/deployment status

The complete Next.js + Supabase app source, including `render.yaml`, is bundled in the downloadable project ZIP. This repository's GitHub integration could not complete the bulk upload in the current session, and a local `git push` failed because the runtime could not resolve `github.com`. Do not deploy the current partially uploaded branch: the publishing dispatcher currently in GitHub is a placeholder.

## Finish the upload
Extract the full ZIP locally and from its `PostPilot` directory run:

```bash
git remote add origin https://github.com/ManikandanP24/PostPilot.git
git fetch origin
git checkout -B main
git add .
git commit -m "Add full PostPilot application" || true
git push -u origin main
```

Because the remote currently contains an incomplete initial commit, Git may reject the push as non-fast-forward. The safest option is to push to a new branch and create a PR, or consciously replace the incomplete branch after reviewing its contents. Do not use `--force` unless you intend to overwrite the current remote history.

## Deploy on Render

After the complete source is on GitHub: https://render.com → **New + → Blueprint** → choose `ManikandanP24/PostPilot` → apply `render.yaml`. Enter environment secrets through Render, update the Render URL in app/OAuth settings, run `supabase/schema.sql` in Supabase SQL Editor, and configure a separate Render Cron Job/external scheduler because `vercel.json` Cron is Vercel-specific.
