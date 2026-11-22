# Zxtract Worker

A small Cloudflare Worker that exposes the extractor scripts already stored in this repository. It does not proxy counselling-site requests or receive extracted allotment data.

## Cloudflare Workers Builds setup

Connect this repository to Cloudflare Workers Builds and configure:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `worker` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

The build script copies `../allotments/` into the Worker's generated static assets while preserving every repository-relative path. It also generates `scripts-manifest.json` by discovering executable JavaScript files. Files whose names contain `bookmarklet` are deliberately excluded.

No GitHub API token, Worker secret, database, or external runtime dependency is required. Git-connected deployment checks out the repository and builds the assets directly.

## Endpoints

- `/` — Worker status page
- `/health` — health check
- `/api/scripts` — generated extractor catalogue
- `/launcher.js` — launcher interface code
- `/scripts/allotments/...` — an individual repository script

For example, `allotments/andhra-pradesh/government-quota.js` is served at:

```text
https://YOUR-WORKER-SUBDOMAIN.workers.dev/scripts/allotments/andhra-pradesh/government-quota.js
```

The catalogue is generated on every build, so adding a JavaScript extractor under `allotments/` makes it appear in the launcher after the next successful deployment. The original folder hierarchy is retained.

## Permanent bookmarklet

After the first deployment, replace `YOUR-WORKER-SUBDOMAIN` in the following bookmark URL with the actual `workers.dev` hostname assigned by Cloudflare. Save the complete one-line value as a Chrome bookmark URL.

```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://YOUR-WORKER-SUBDOMAIN.workers.dev/launcher.js";s.async=true;s.onerror=()=>alert("Zxtract launcher could not load. Check the Worker URL or the site's Content Security Policy.");document.documentElement.appendChild(s)})()
```

Tap the bookmark on a counselling page to load the launcher. Select an extractor and load it. The launcher obtains the catalogue and selected script from the Worker.

## Browser security note

The launcher injects a classic external script from the Worker into the current page. A target website's Content Security Policy may block that script. If Zynerd blocks it, the launcher reports a loading error; the deployed Worker itself cannot override the target page's CSP. Test this on Zynerd after deployment before relying on the launcher.

## Local build

From this directory:

```sh
npm install
npm run build
npx wrangler dev
```

Generated assets are written to `worker/public/` and are git-ignored.
