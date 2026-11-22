/**
 * Zxtract — Andhra Pradesh Government Quota
 *
 * STATUS: SCAFFOLD ONLY. Not yet an operational extractor.
 *
 * Source: Zynerd allotment portal
 * Historical endpoint: /api_v2/seat_differences/table_data
 * Historical pagination: offset-based, 50 records per page
 * Historical response path: json.data.records
 *
 * Expected historical fields:
 * state, institute, course, from, to, difference, remark
 *
 * Before implementation:
 * 1. Re-inspect the live XHR request and response.
 * 2. Confirm pagination parameters and termination behaviour.
 * 3. Implement incremental JSONL writing via Android Chrome's
 *    File System Access API, with a serialized write queue.
 * 4. Keep response objects and page buffers short-lived.
 * 5. Add duplicate handling and visible capture/error counters.
 * 6. Validate output against the portal before marking this script ready.
 *
 * Instructions and maintenance notes:
 * ./README.md
 *
 * Do not paste this scaffold into Eruda expecting it to capture data.
 */

export const extractor = {
  id: "allotments.andhra-pradesh.government-quota",
  jurisdiction: "Andhra Pradesh",
  quota: "government",
  source: "Zynerd",
  status: "scaffold",
  outputFormat: "jsonl",
  historicalRequest: {
    endpointPath: "/api_v2/seat_differences/table_data",
    pagination: {
      parameter: "offset",
      pageSize: 50,
    },
    responseRecordsPath: ["data", "records"],
  },
  historicalFields: [
    "state",
    "institute",
    "course",
    "from",
    "to",
    "difference",
    "remark",
  ],
};
