# Andhra Pradesh allotments

Dataset-specific scripts for Andhra Pradesh postgraduate medical allotment data.

## Government quota

Script: [`government-quota.js`](./government-quota.js)

Status: **Scaffold only — live capture implementation pending.**

### Intended workflow

1. Open the relevant allotment portal in Android Chrome.
2. Open Eruda Console and load the script.
3. Select/create the output file when prompted.
4. Start capture, then paginate through the portal normally.
5. The script should append each page's extracted records to the same local file.
6. Pause or stop capture before leaving the page.
7. Validate the output record count and representative records before using the dataset.

### Current source observations

The previous Zynerd capture workflow used:

- XHR endpoint path: `/api_v2/seat_differences/table_data`
- Pagination: `offset`, with 50 records per page
- Observed record location: `json.data.records`
- Observed fields: `state`, `institute`, `course`, `from`, `to`, `difference`, `remark`

These are historical observations, not guaranteed current API contracts. Recheck the request URL, pagination parameters, response shape, and field names before implementing or running the scraper.

### Output format

Use JSON Lines (`.jsonl`): one complete record per line. Append records as pages arrive rather than retaining the full dataset in memory.

### Validation checklist

- [ ] Confirm the live endpoint and pagination behaviour.
- [ ] Confirm the response record path and field names.
- [ ] Confirm each page is written exactly once or deduplicated by a stable record key.
- [ ] Confirm writes are serialized so concurrent XHR responses cannot race.
- [ ] Confirm the file remains readable after stopping and restarting capture.
- [ ] Compare captured page/record counts with the portal.
- [ ] Record the browser/device and validation date below.

### Change log

Add dated notes here whenever the portal, endpoint, response schema, or script behaviour changes.
