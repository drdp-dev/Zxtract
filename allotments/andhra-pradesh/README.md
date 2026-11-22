# Andhra Pradesh allotments

Dataset-specific extractor scripts for Andhra Pradesh postgraduate medical allotment data.

## Government quota — Zynerd

Script: [`government-quota.js`](./government-quota.js)

Current extractor version: **1.5.4**

### Launch on Android Chrome

1. Open the Zynerd Andhra Pradesh Government Quota allotments table.
2. Tap the saved **Zxtract** bookmarklet.
3. Select **Andhra Pradesh Government Quota (Zynerd)** under **Extractor**.
4. Tap **Load selected extractor**. The **Zxtract · Extractor** panel appears.
5. Tap **Choose file & start** and select a new `.json` file.
   - If Android creates the file but the save picker reports an `AbortError`, the button changes to **Select created file**. Tap it and select the file Android just created.
   - The extractor initializes the selected file as a standard JSON array. Use a new filename to preserve an earlier capture.
6. Trigger one page load manually after starting capture. For example, change the table page or rank view. This first captured page starts automatic pagination.
7. Each subsequent **Next** click happens only after the previous page has been written and the file writer has closed. Do not click Next manually while capture is running.
8. Monitor the page and record counts in the panel. The extractor restores the original XHR methods when capture completes or encounters an error.
9. The panel offers **Close** after completion.

The popup can be moved using its top handle. Its position is saved on the Zynerd website and restored on reload.

### Confirmed source contract

Observed from the live Zynerd table:

- Method: `POST`
- Endpoint: `/api_v2/allotments/table_data`
- Counselling ID: `3` (Andhra Pradesh Government Quota - PG Medical)
- Pagination: `offset`, observed page size 50
- Response record path: `data.records`

The endpoint and response shape were inspected on 2026-11-22. Recheck if Zynerd changes its table implementation.

### Output schema

Each JSON array object contains exactly these six fields:

| Output field | Source |
|---|---|
| `rank` | `record.rank` |
| `institute_id` | `record.institute.id` |
| `institute` | `record.institute.name` |
| `course` | `record.course.name` |
| `quota` | `record.quota.name` |
| `category` | `record.category` |

Missing values are written as JSON `null`. No additional source fields or extractor metadata are included.

### Capture behaviour

- Matches only `POST` XHR requests to the endpoint with `counselling_id=3`.
- Reads the `offset` query parameter to identify pages.
- Accepts successful 2xx responses containing an array at `data.records`.
- Writes the six output fields incrementally inside one pretty-printed JSON array.
- Serializes writes through a promise queue.
- Automatically clicks `a[aria-label="Next page"]` only after the current page's write completes.
- Stops on a short page, missing or disabled Next control, or a write failure.
- Does not issue independent API requests or retain the complete dataset in browser memory.
- Restores its XHR method overrides when capture ends or fails.

### Notes

The repository also contains `government-quota-bookmarklet-test.js`, a standalone two-page JSONL test utility. It is separate from the production extractor and is not included in the launcher because its filename contains `bookmarklet`.
