# Andhra Pradesh allotments

Dataset-specific extractor scripts for Andhra Pradesh postgraduate medical allotment data.

## Government quota — Zynerd

Script: [`government-quota.js`](./government-quota.js)

Current extractor version: **1.5.9**

### Launch on Android Chrome

1. Open the Zynerd Andhra Pradesh Government Quota allotments table.
2. Tap the saved **Zxtract** bookmarklet.
3. Select **Andhra Pradesh Government Quota (Zynerd)** under **Extractor**.
4. Tap **Load selected extractor**. The **Zxtract · Extractor** panel appears.
5. Tap **Choose file & start** and select a new `.json` file.
   - If Android creates the file but the save picker reports an `AbortError`, the button changes to **Select created file**. Tap it and select the file Android just created.
   - The extractor initializes the selected file as a standard JSON array. It displays separate stages for opening, writing, and finalizing the file, so a stalled stage can be identified. Use a new filename to preserve an earlier capture.
6. Trigger one page load manually after starting capture. For example, change the table page or rank view. This first captured page starts automatic pagination.
7. Each subsequent **Next** click happens only after the previous page has been written and the file writer has closed. Do not click Next manually while capture is running.
8. Monitor the page and record counts in the panel. The extractor restores the original XHR methods when capture completes or encounters an error.
9. To extract another round on the same counselling page, select a new output file and tap **Choose file & start** again. The extractor reinstalls its XHR hooks for each new run; a page reload is not required between rounds.
10. During extraction, the start button is hidden to prevent another run from being started. After completion, **Close** and **Choose file & start** are shown for the next round.

The popup can be moved using its top handle. Its position is saved on the Zynerd website and restored on reload.

## Management quota — Zynerd

Script: [`management-quota.js`](./management-quota.js)

Current extractor version: **1.1.0**

### Launch on Android Chrome

1. Open the Zynerd Andhra Pradesh Management Quota allotments table (`counselling_id=4`).
2. Tap the saved **Zxtract** bookmarklet.
3. Select **Andhra Pradesh Management Quota (Zynerd)** under **Extractor**.
4. Tap **Load selected extractor**. The **Zxtract · Extractor** panel appears.
5. Tap **Choose file & start** and select a new `.json` file. The suggested filename is `AP-MQ-2026-R1.json`.
6. Trigger one page load manually after starting capture. For example, change the table page or rank view. This first captured page starts automatic pagination.
7. The extractor saves each page before clicking **Next**. Do not click Next manually while capture is running.
8. Monitor page and record counts. On completion, the file is closed and the start button becomes available for another round.

The extractor uses the same Zynerd table endpoint as Government Quota, but matches only `counselling_id=4`. It expects `data.records` and a page size of 50. The initial inspection showed 503 records (11 pages) and request-body fields `session`, `has_joined`, `displayed_fields`, and `filter_rank`.

### Output schema

Each JSON object contains exactly these six fields:

- `rank` (sourced from the API’s `ai_rank` field)
- `institute_id`
- `institute`
- `course`
- `quota`
- `category`

Nested institute, course, and quota values are flattened to their IDs/names. Missing values are written as JSON `null`.

### Confirmed source contract

Observed from the live Zynerd Management Quota table:

- Method: `POST`
- Endpoint: `/api_v2/allotments/table_data`
- Counselling ID: `4` (Andhra Pradesh Management Quota)
- Pagination: `offset`, observed page size 50
- Response record path: `data.records`
- Rank source: `record.ai_rank`

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
- Stops on a short page, missing or disabled Next control, a repeated offset, an unexpected offset, or a write failure.
- Verifies sequential offsets using the previous page's actual record count; the first manually triggered page may begin at any offset.
- Displays the last successfully saved offset in the panel.
- Does not issue independent API requests or retain the complete dataset in browser memory.
- Restores its XHR method overrides when capture ends or fails.
- Tracks every captured offset and rejects duplicate offsets before writing.
- Verifies that each subsequent offset equals the previous offset plus the previous page's record count.
- Displays the last successfully saved offset and stops with an explicit error if pagination repeats, skips, or resets.

### Notes

The repository also contains `government-quota-bookmarklet-test.js`, a standalone two-page JSONL test utility. It is separate from the production extractor and is not included in the launcher because its filename contains `bookmarklet`.
