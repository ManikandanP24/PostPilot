# Uploading the complete source

The full PostPilot source bundle is provided in the project ZIP generated for this task. The GitHub connector did not reliably accept the bulk file upload in this run; the repository currently contains setup/deployment files only and is not yet a complete buildable app.

Extract the ZIP locally, then from the extracted `PostPilot` directory run:

```bash
git init
git branch -M main
git remote add origin https://github.com/ManikandanP24/PostPilot.git
git add .
git commit -m "Add full PostPilot application"
git push -u origin main
```

If the repository already has an initial commit, first fetch and merge its `main` branch, or use a fresh branch and PR instead of overwriting history.
