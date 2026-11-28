# Andhra Pradesh allotments

Dataset-specific extractor scripts for Andhra Pradesh postgraduate medical allotment data on Zynerd.

## Government quota

Script: [`government-quota.js`](./government-quota.js)  
Current version: **1.7.0**  
Counselling ID: `3`  
Rank source: `record.rank`

## Management quota

Script: [`management-quota.js`](./management-quota.js)  
Current version: **1.3.0**  
Counselling ID: `4`  
Rank source: `record.ai_rank`

Both extractors use `POST /api_v2/allotments/table_data`, read records from `data.records`, and write the same six-field JSON schema:

- `rank`
- `institute_id`
- `institute`
- `course`
- `quota`
- `category`

Nested institute, course, and quota values are flattened to their IDs/names. Missing values are written as JSON `null`.

## Capture behaviour and safeguards

1. Open the appropriate AP Government Quota or Management Quota allotment table on Zynerd.
2. Launch the matching extractor from the Zxtract bookmarklet.
3. Choose a new `.json` output file and start capture. On Android, if the save picker reports an `AbortError` after creating the file, use the **Select created file** recovery option when shown.
4. Trigger one page load manually after capture starts. The extractor captures that response and then handles subsequent pagination automatically.
5. Each page is written and the file writer is closed before the extractor clicks **Next**. Do not click Next manually while capture is running.
6. Before writing each page, the extractor checks ranks against all previously captured pages and within the current page. A duplicate rank stops extraction and resets the selected JSON file to `[]`.
7. The panel displays page count, record count, errors, and the last successfully saved offset.
8. The extractor tracks captured offsets and rejects a repeated offset before writing the repeated page.
9. It verifies that each subsequent offset equals the previous offset plus the previous page's actual record count. The first manually triggered page may begin at any valid offset.
10. A repeated, skipped, or reset offset stops capture with an explicit pagination error. A short page, missing/disabled Next control, HTTP/parse error, or write failure also stops capture.
11. XHR hooks are restored when capture completes or stops.

Use a new output filename for each round to preserve earlier captures. The scripts do not issue independent API requests or retain the complete dataset in browser memory.

## Management Quota source notes

The initial live inspection showed 503 records (11 pages), with request-body fields `session`, `has_joined`, `displayed_fields`, and `filter_rank`. The observed page size was 50. Recheck the source contract if Zynerd changes its table implementation.

## Test utility

[`government-quota-bookmarklet-test.js`](./government-quota-bookmarklet-test.js) is a standalone two-page JSONL test utility. It is separate from the production Government Quota extractor and is not included in the launcher because its filename contains `bookmarklet`.
