# Deployment

CampusKit builds to a folder of static files, so any static host works. There is no server-side code, database or environment secret to configure.

```bash
pnpm install
pnpm build
```

The site is written to `apps/web/dist/`. Preview it locally with `pnpm preview` (<http://localhost:4173/>).

Before you publish, set `repositoryUrl` in `apps/web/src/site.config.ts` to your repository's address, so the footer links to the source code. Until it is set, no repository link is shown.

## What every host needs

- **Single-page app fallback.** Addresses such as `/projects/attendance-system` are handled in the browser, so the host must serve `index.html` for paths that don't match a file.
- **The right base path.** If the site is served from a sub-folder (for example `https://<user>.github.io/campuskit/`), build it with that path:

  ```bash
  CAMPUSKIT_BASE=/campuskit/ pnpm build
  ```

  Keep the leading and trailing slashes. On Windows PowerShell, run `$env:CAMPUSKIT_BASE="/campuskit/"; pnpm build`.

- **Caching.** Files in `assets/` and `template-bundles/` have content hashes in their names and can be cached for a long time. `index.html` should not be cached, so visitors get new releases.

The built `index.html` contains a Content Security Policy in a `<meta>` tag, so no extra headers are required. If your host lets you set headers, you can add `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`. It builds the site with `CAMPUSKIT_BASE` set to `/<repository-name>/` and copies `index.html` to `404.html`, which is how GitHub Pages serves single-page apps.

1. Push the repository to GitHub.
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Run the **Deploy to GitHub Pages** workflow from the **Actions** tab, or push to `main`.

If you use a custom domain at the root of the domain, change `CAMPUSKIT_BASE` in the workflow to `/`.

GitHub Pages answers deep links through `404.html` with an HTTP 404 status. Browsers show the page normally, but search engines may skip those addresses.

## Netlify

`netlify.toml` in the repository root configures the build command, the output folder and the single-page app fallback. Create a new site from the repository and keep the settings it detects.

## Other static hosts

Upload the contents of `apps/web/dist/` and configure the host to serve `index.html` for unknown paths (often called “SPA mode”, “rewrite to index.html” or a catch-all route). JSON files in `template-bundles/` must be served as `application/json`, which every common host does by default.
