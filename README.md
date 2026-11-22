# Zxtract

A version-controlled collection of modular browser-side data extraction scripts and operating instructions.

## Repository layout

```text
allotments/
  andhra-pradesh/
    README.md
    government-quota.js
worker/
  src/
    index.js
  launcher.js
  build.mjs
  wrangler.jsonc
```

## Conventions

- Use full, lowercase, hyphenated state and union-territory names in directory paths.
- Keep each dataset/source workflow in its own script.
- Keep source-specific setup, execution, pagination, output schema, and troubleshooting instructions beside the script.
- Prefer small, independently maintainable modules over one universal scraper.
- Capture data incrementally to user-selected local storage; do not accumulate complete datasets in browser memory.
- Never commit captured datasets, session cookies, access tokens, or other credentials.
- Document the source endpoint and response shape, but treat them as changeable implementation details.
- Record tested browser/device combinations and the date of the last successful validation.
- Update the script and its documentation together whenever the source changes.

## Script status

A script is not considered operational until its instructions have been tested against the live source and its output has been validated.

## Cloudflare Worker launcher

The `worker/` project serves a launcher and discovers executable JavaScript extractors directly from the existing `allotments/` folder tree. It preserves repository-relative paths and generates its catalogue during Git-connected deployment.

See [worker/README.md](./worker/README.md) for Cloudflare Workers Builds configuration, endpoints, and the permanent bookmarklet setup.
