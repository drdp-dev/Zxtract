# Zxtract

A version-controlled collection of modular browser-side scripts for extracting counselling data and diagnosing source-page/API behaviour.

## Repository layout

```text
allotments/       # Extractor scripts
  <state>/
diagnostics/      # Diagnostic and inspection scripts
worker/           # Cloudflare Worker launcher and static script delivery
```

## Script categories

- **Extractor** — every JavaScript file under `allotments/`. Keep source- and dataset-specific extraction workflows here.
- **Diagnostics** — every JavaScript file under `diagnostics/`. Use this for API inspection, response-shape discovery, troubleshooting, and other diagnostic utilities.

The launcher assigns these categories automatically from the top-level directory. New scripts placed in either folder appear in the corresponding category after the next successful Worker build and deployment. Do not create separate state-specific launcher categories.

## Conventions

- Use full, lowercase, hyphenated state and union-territory names in extractor directory paths.
- Keep each dataset/source workflow in its own script.
- Keep source-specific setup, execution, pagination, output schema, and troubleshooting instructions beside the script.
- Prefer small, independently maintainable modules over one universal scraper.
- Capture data incrementally to user-selected local storage; do not accumulate complete datasets in browser memory.
- Never commit captured datasets, session cookies, access tokens, or other credentials.
- Document the source endpoint and response shape, but treat them as changeable implementation details.
- Record tested browser/device combinations and the date of the last successful validation.
- Update scripts and their documentation together whenever the source changes.

## Script status

A script is not considered operational until its instructions have been tested against the live source and its output has been validated.

## Cloudflare Worker launcher

The `worker/` project serves the Zxtract bookmarklet launcher and discovers JavaScript files from the repository. It preserves repository-relative script paths, groups them into **Extractor**, **Diagnostics**, or **General**, and generates its catalogue during Git-connected deployment.

See [worker/README.md](./worker/README.md) for Workers Builds configuration, endpoints, and bookmarklet setup.
