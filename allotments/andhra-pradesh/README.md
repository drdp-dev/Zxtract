# Andhra Pradesh allotments

Dataset-specific scripts for Andhra Pradesh postgraduate medical allotment data.

## Government quota — Zynerd

Script: [`government-quota.js`](./government-quota.js)

Status: **Implemented; live end-to-end validation pending.**

### Known source contract

Previously observed Zynerd request:

- Method: `POST`
- URL: `https://infra.zynerd.com/api_v2/seat_differences/table_data?offset=50`
- Pagination: `offset`, 50 records per page
- POST body:
  ```json
  {
    "session": "2026",
    "has_joined": false,
    "displayed_fields": [
      "state",
      "institute",
      "course",
      "from",
      "to",
      "difference",
      "remark"
    ],
    "filter_rank": {}
  }
  ```
- Response record path: `data.records` (inside the JSON response)
- Previously observed total: 2,776 records

The request and response details above are observations from an earlier session, not a permanent API guarantee. Recheck them if Zynerd changes its table implementation.

### Run on Android Chrome with Eruda

1. Open the Zynerd seat-differences table in Android Chrome.
2. Open Eruda Console.
3. Open this repository file and copy the complete contents of `government-quota.js`.
4. Paste the script into Eruda Console and execute it once.
5. A **Zxtract · Andhra Pradesh Government Quota** panel should appear on the page.
6. Tap **Choose file & start** and save a new `.jsonl` file in Downloads or another accessible folder.
   - Selecting an existing file replaces its contents at the start of capture. Use a new filename to preserve previous captures.
7. Paginate through the Zynerd table normally. The script captures matching successful XHR responses and appends each page to the selected file.
8. Use **Pause** before temporarily stopping pagination, **Resume** to continue, and **Stop** to wait for queued writes to finish.
9. Open the resulting file with a text editor or JSONL viewer and validate the records.

Do not start pagination until the panel says **Capturing**.

### What the script captures

- Only XHR requests whose URL path contains `/api_v2/seat_differences/table_data`.
- Only successful HTTP responses (2xx) with an array at `data.records`.
- The complete original record object, including nested `institute` and `course` values.
- A `_zxtract` object added to each output record, containing extractor ID, source, endpoint, page offset, row index, and capture timestamp.

The script does not issue its own requests, modify Zynerd requests, or require credentials to be copied. It observes the requests made by the open authenticated page.

### Output and memory behaviour

- Output format: JSON Lines (`.jsonl`), one record per line.
- Each page is serialized and appended to the chosen file.
- Writes are serialized through a promise queue to avoid concurrent file-write races.
- Duplicate page responses are skipped using the request offset and POST body as the page key.
- The script does not retain the complete dataset. It retains lightweight page keys and counters for the current browser session.
- Avoid logging full response objects in Eruda.

### Troubleshooting

- **Panel does not appear:** confirm the script was executed after the page loaded; execute it once more only after refreshing if necessary.
- **No records are saved:** confirm the live table still uses the documented endpoint and that its response contains `data.records`.
- **File picker unavailable:** use Android Chrome in a secure context and check that `showSaveFilePicker` is available.
- **Write error:** stop pagination, note the displayed error, and preserve the file for inspection before restarting.
- **Duplicate page skipped:** the same offset and POST body were already captured in this session. Start a fresh capture to reset the in-memory page index.

### Validation checklist

- [ ] Panel appears after executing the script in Eruda.
- [ ] File picker creates the selected JSONL file.
- [ ] First page writes 50 records (or the actual page size returned).
- [ ] Subsequent offsets append rather than overwrite.
- [ ] Repeating the same offset and request body does not duplicate a page.
- [ ] Stop waits for queued writes to finish.
- [ ] JSONL parses line by line and nested institute/course values are intact.
- [ ] Compare final count with Zynerd's displayed total (historically 2,776).
- [ ] Record browser/device and validation date after testing.

### Change log

- 2026-11-22: Initial streaming XHR extractor committed. Live end-to-end validation remains pending.
