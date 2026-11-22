/**
 * Zxtract diagnostics — inspect Zynerd institute fields
 * Version: 1.0.0
 *
 * Run in Eruda Console on the Andhra Pradesh Government Quota allotments page.
 * Then trigger one table page load. The script logs the raw institute object
 * and the keys present on the first few API records. It does not modify data
 * or trigger pagination.
 *
 * Endpoint:
 * POST /api_v2/allotments/table_data?counselling_id=3&offset=N
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_INSTITUTE_DIAGNOSTICS_V1__";
  const ENDPOINT = "/api_v2/allotments/table_data";
  const COUNSELLING_ID = "3";

  if (window[KEY]?.installed) {
    console.warn("[Zxtract diagnostics] Already installed. Reload the page before running again.");
    return;
  }

  if (!window.XMLHttpRequest) {
    console.error("[Zxtract diagnostics] XMLHttpRequest unavailable.");
    return;
  }

  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  const state = { installed: true, captured: false };
  window[KEY] = state;

  function restore() {
    if (proto.open === wrappedOpen) proto.open = originalOpen;
    if (proto.send === wrappedSend) proto.send = originalSend;
    state.installed = false;
  }

  function inspect(xhr) {
    const request = xhr.__zxtractDiagnosticRequest;
    xhr.__zxtractDiagnosticRequest = null;
    if (!request || state.captured) return;

    if (xhr.status < 200 || xhr.status >= 300) {
      console.error("[Zxtract diagnostics] API request failed:", xhr.status, request);
      restore();
      return;
    }

    let payload;
    try {
      if (xhr.responseType === "json" && xhr.response && typeof xhr.response === "object") {
        payload = xhr.response;
      } else if (typeof xhr.responseText === "string" && xhr.responseText) {
        payload = JSON.parse(xhr.responseText);
      } else if (xhr.response && typeof xhr.response === "object") {
        payload = xhr.response;
      }
    } catch (error) {
      console.error("[Zxtract diagnostics] Could not parse API response:", error);
      restore();
      return;
    }

    const records = payload?.data?.records;
    if (!Array.isArray(records) || records.length === 0) {
      console.warn("[Zxtract diagnostics] No records found at data.records.", payload);
      restore();
      return;
    }

    state.captured = true;
    console.group("[Zxtract diagnostics] Zynerd institute field inspection");
    console.log("Request:", request);
    console.log("Record count in this response:", records.length);
    console.log("Top-level record keys:", Object.keys(records[0] || {}));
    console.log("First raw record:");
    console.dir(records[0]);
    console.log("First record's raw institute object:");
    console.dir(records[0]?.institute);
    console.log("Institute object keys:", Object.keys(records[0]?.institute || {}));
    console.log("Sample institute objects (up to 5 records):");
    console.table(records.slice(0, 5).map((record, index) => ({
      sample: index + 1,
      institute_id: record?.institute?.id ?? null,
      institute_name: record?.institute?.name ?? null,
      institute_keys: Object.keys(record?.institute || {}).join(", ")
    })));
    console.log("Full API payload is available in the logged response object above if further inspection is needed.");
    console.groupEnd();

    restore();
    console.info("[Zxtract diagnostics] Inspection complete. XHR hooks restored. No pagination was triggered.");
  }

  function onLoadEnd() {
    try {
      inspect(this);
    } catch (error) {
      console.error("[Zxtract diagnostics] Inspection failed:", error);
      restore();
    }
  }

  const wrappedOpen = function(method, url) {
    this.__zxtractDiagnosticRequest = null;
    try {
      const parsed = new URL(String(url), location.href);
      if (
        parsed.pathname === ENDPOINT &&
        parsed.searchParams.get("counselling_id") === COUNSELLING_ID
      ) {
        this.__zxtractDiagnosticRequest = {
          method: String(method || "GET").toUpperCase(),
          offset: Number(parsed.searchParams.get("offset") || 0)
        };
      }
    } catch (_) {}
    return originalOpen.apply(this, arguments);
  };

  const wrappedSend = function() {
    if (this.__zxtractDiagnosticRequest?.method === "POST") {
      this.addEventListener("loadend", onLoadEnd, { once: true });
    }
    return originalSend.apply(this, arguments);
  };

  proto.open = wrappedOpen;
  proto.send = wrappedSend;

  console.info("[Zxtract diagnostics] Installed. Trigger one table page load; the first matching API response will be inspected.");
})();
