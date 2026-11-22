# Andhra Pradesh allotments

Dataset-specific scripts for Andhra Pradesh postgraduate medical allotment data.

## Government quota — Zynerd

## Standalone bookmarklet test (no Eruda)

A two-page diagnostic bookmarklet is available at [`government-quota-bookmarklet-test.js`](./government-quota-bookmarklet-test.js).

1. Open the raw file on GitHub and copy its complete contents, including the `javascript:` prefix.
2. In Chrome, create or edit a bookmark and paste the copied contents into its URL field.
3. Reload the Zynerd allotments page without opening Eruda.
4. Tap the bookmark, then tap **Start 2-page test**.
5. Trigger one page load manually (change page or rank view). The bookmarklet captures that response and automatically clicks Next after processing it.
6. After two pages, tap **Download JSONL**.

This is intentionally a two-page test, not the full 35-page extractor. It keeps only the test output in memory and downloads it as a Blob; it does not yet implement incremental file writes. Confirm that the downloaded file contains 100 JSONL records before extending the bookmarklet for full capture.


Script: [`government-quota.js`](./government-quota.js)

Status: **v1.4.2 adds recovery for Android file-manager providers that create the file but reject the save-picker promise; live 35-page validation pending.**

### Confirmed source contract

Observed directly from the live Zynerd table using the diagnostic script:

- Method: `POST`
- URL: `https://infra.zynerd.com/api_v2/allotments/table_data?counselling_id=3&offset=0`
- Endpoint path: `/api_v2/allotments/table_data`
- Counselling ID: `3` (Andhra Pradesh Government Quota - PG Medical)
- Pagination: `offset`, observed page size 50
- Response record path: `data.records`
- Diagnostic observation: HTTP 200, 50 records at offset 0

The endpoint and response were confirmed on 2026-11-22. Recheck if Zynerd changes its table implementation.

### Exact output schema

Each JSONL line contains exactly these six fields:

| Output field | Source |
|---|---|
| `rank` | `record.rank` |
| `institute_id` | `record.institute.id` |
| `institute` | `record.institute.name` |
| `course` | `record.course.name` |
| `quota` | `record.quota.name` |
| `category` | `record.category` |

No other source fields, nested objects, capture timestamps, or extractor metadata are written. Missing values are written as JSON `null`.

### Run on Android Chrome with Eruda

1. Open the Zynerd Andhra Pradesh Government Quota allotments table in Android Chrome.
2. Reload the Zynerd page to clear any previously installed extractor hooks, then open Eruda Console.
3. Copy the complete contents of `government-quota.js` from this repository.
4. Paste and execute it once.
5. The **Zxtract · AP Government Quota** panel should appear.
6. Tap **Choose file & start** and select a new `.jsonl` file.
   - If Android creates the file but the save picker reports an `AbortError`, the button changes to **Select saved file**. Tap it and select the file Android just created. The extractor then initializes that file and starts normally.
   - The selected file is cleared when a new capture starts. Use a new filename to preserve an earlier capture.
7. Trigger one page load manually after starting capture. For example, switch the rank view or navigate to page 1 if you are currently on page 2. This first captured page starts automatic pagination.
8. After each page is fully written and the file writer is closed, the script clicks **Next** and captures the following page. Do not click Next manually while automation is running.
9. Monitor the live page and record counts in the panel. The script restores the original XHR methods automatically when capture completes or encounters an error.
10. Inspect the JSONL output and compare its record count with the table.

### Capture behaviour

- Matches only `POST` XHR requests to `/api_v2/allotments/table_data` with `counselling_id=3`.
- Reads the `offset` query parameter to identify pages.
- Accepts successful 2xx responses containing an array at `data.records`.
- Writes only the six fields listed above.
- Appends one JSON object per line.
- Serializes writes through a promise queue.
- Relies on sequential pagination rather than retaining a Set of every processed offset.
- Starts only after a page is loaded manually after capture begins; it does not assume the already-rendered table was captured.
- Automatically clicks `a[aria-label="Next page"]` only after the current page's write has completed successfully.
- Stops on a short page, a missing Next control, a disabled Next control, or a write failure.
- Builds each page's six-field JSONL text immediately; the asynchronous write queue retains only that text, not the API record array or XHR object.
- Uses one shared `loadend` handler rather than a per-request closure over each XHR object.
- Removes its XHR method overrides when the final page is reached or after a capture, request, or write error.
- Does not issue independent API requests or store the complete dataset in memory.

### Validation checklist

- [ ] Panel appears after executing the script.
- [ ] File picker creates a `.jsonl` file with the correct extension.
- [ ] First page (offset 0) writes 50 records.
- [ ] Next page is clicked automatically only after the preceding 50 records are saved.
- [ ] The final short page is saved without another Next click.
- [ ] Each line contains exactly the six documented fields.
- [ ] XHR method overrides are restored when capture stops or completes.
- [ ] Live status and record counts update after each saved page.
- [ ] Final record count matches the table's total.

### Change log

- 2026-11-22: Live diagnostic identified the actual allotments endpoint and six-field response schema.
- 2026-11-22: Extractor corrected to capture the Andhra Pradesh counselling table and emit only the six requested fields. Manual two-page capture produced 100 records.
- 2026-11-22: v1.2.0 adds save-gated automatic pagination; the first automated run crashed after 10 pages with Eruda active.
- 2026-11-22: v1.3.0 reduces retained state, queues only projected JSONL text, uses a shared XHR completion handler, and restores XHR methods on completion/error. Full 35-page validation pending.
- 2026-11-22: v1.4.0 removes pause, resume, stop, and hide controls; the panel now has one start button and live capture status.
- 2026-11-22: v1.4.1 separates file selection from file initialization so an initialization AbortError is no longer mislabeled as a cancelled selection.

- 2026-11-22: v1.4.2 adds a second, user-initiated open-file picker after an Android save-picker `AbortError`, allowing the extractor to recover the file that the file manager created but whose handle was not returned.
