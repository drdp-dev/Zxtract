# Zxtract Worker

A small Cloudflare Worker that serves the Zxtract bookmarklet launcher and repository scripts. It does not proxy counselling-site requests or receive extracted allotment data.

## Cloudflare Workers Builds setup

Connect this repository to Cloudflare Workers Builds and configure:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `worker` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

The Worker uses the custom domain `https://zxtract.drdp.dev`. Its Wrangler configuration disables the `workers.dev` hostname and Preview/Version URLs.

## Script discovery and categories

The build discovers executable JavaScript files throughout the repository, excluding the `worker/` implementation, hidden folders, dependency folders, and files whose names contain `bookmarklet`. It copies each script to the generated static assets using its exact repository-relative path and generates `scripts-manifest.json`.

Categories are assigned from the top-level directory:

- `allotments/` → **Extractor**
- `diagnostics/` → **Diagnostics**
- Other eligible locations → **General**

This means new extractor and diagnostic scripts automatically appear under the correct category without changing the launcher. Keep all extraction scripts under `allotments/` and all diagnostic scripts under `diagnostics/`.

No GitHub API token, Worker secret, database, or external runtime dependency is required. Git-connected deployment checks out the repository and builds the assets directly.

## Endpoints

- `/` — Worker status page
- `/health` — health check
- `/api/scripts` — generated script catalogue, including category and title
- `/launcher.js` — launcher interface
- `/scripts/<repository-relative-path>` — an individual repository script

For example, `allotments/andhra-pradesh/government-quota.js` is served at:

```text
https://zxtract.drdp.dev/scripts/allotments/andhra-pradesh/government-quota.js
```

The catalogue is generated on every build. The original folder hierarchy is retained in script URLs, while the launcher groups scripts under the top-level **Extractor** and **Diagnostics** categories.

## Permanent bookmarklet

Save the following one-line value as a Chrome bookmark URL:

```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://zxtract.drdp.dev/launcher.js";s.async=true;s.onerror=()=>alert("Zxtract launcher could not load. Check the Worker URL or the site's Content Security Policy.");document.documentElement.appendChild(s)})()
```

Tap the bookmark on a supported counselling page to open the launcher. Choose a script from **Extractor** or **Diagnostics**, then tap **Load selected extractor**. The launcher obtains the catalogue and selected script from the Worker.

The launcher and script popups are draggable by their top handle. Each popup saves its own position in the current website's `localStorage` and restores it on reload.

## Browser security note

The launcher injects a classic external script from the Worker into the current page. A target website's Content Security Policy may block that script. If blocked, the launcher reports a loading error; the Worker cannot override the target page's CSP.

## Local build

From this directory:

```sh
npm install
npm run build
npx wrangler dev
```

Generated assets are written to `worker/public/` and are git-ignored.
