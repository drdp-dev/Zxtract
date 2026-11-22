/**
 * Zxtract diagnostics — inspect Zynerd institute fields
 * Version: 1.1.0
 *
 * Run in Eruda Console on the Andhra Pradesh Government Quota allotments page.
 * A small on-page panel appears. Trigger one table page load, then tap Copy
 * inspection to copy the captured institute fields for sharing.
 *
 * Endpoint:
 * POST /api_v2/allotments/table_data?counselling_id=3&offset=N
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_INSTITUTE_DIAGNOSTICS_V1_1__";
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
  const state = { installed: true, captured: false, copyText: "", panel: null };
  window[KEY] = state;

  const panel = document.createElement("section");
  panel.style.cssText =
    "position:fixed;z-index:2147483647;right:12px;bottom:12px;left:12px;" +
    "max-width:520px;margin-left:auto;padding:12px;background:#111827;color:#f9fafb;" +
    "border:1px solid #374151;border-radius:12px;box-shadow:0 4px 24px #0008;" +
    "font:13px/1.45 system-ui;";
  const heading = document.createElement("div");
  heading.textContent = "Zxtract · Institute diagnostics";
  heading.style.cssText = "font-weight:700;margin-bottom:7px;";
  const status = document.createElement("div");
  status.textContent = "Ready. Trigger one table page load to inspect the API response.";
  status.style.cssText = "color:#bfdbfe;margin-bottom:9px;";
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy inspection";
  copy.disabled = true;
  copy.style.cssText = "padding:8px 11px;border:0;border-radius:7px;background:#2563eb;color:white;font:600 13px system-ui;min-height:36px;opacity:.55;";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.style.cssText = "padding:8px 11px;border:1px solid #6b7280;border-radius:7px;background:#374151;color:white;font:600 13px system-ui;min-height:36px;";
  actions.append(copy, close);
  panel.append(heading, status, actions);
  document.body.appendChild(panel);
  state.panel = panel;

  function restore() {
    if (proto.open === wrappedOpen) proto.open = originalOpen;
    if (proto.send === wrappedSend) proto.send = originalSend;
    state.installed = false;
  }

  async function copyInspection() {
    if (!state.copyText) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(state.copyText);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      status.textContent = "Inspection copied. Paste it into this chat.";
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = state.copyText;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      document.body.appendChild(area);
      area.focus();
      area.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch (_) {}
      area.remove();
      status.textContent = copied
        ? "Inspection copied. Paste it into this chat."
        : "Automatic copy failed. Tap and hold the text is not available here; please retry in Chrome.";
    }
  }

  copy.addEventListener("click", copyInspection);
  close.addEventListener("click", () => panel.remove());

  function inspect(xhr) {
    const request = xhr.__zxtractDiagnosticRequest;
    xhr.__zxtractDiagnosticRequest = null;
    if (!request || state.captured) return;

    if (xhr.status < 200 || xhr.status >= 300) {
      status.textContent = "API request failed (HTTP " + xhr.status + "). Reload and try again.";
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
      status.textContent = "Could not parse API response: " + (error?.message || String(error));
      restore();
      return;
    }

    const records = payload?.data?.records;
    if (!Array.isArray(records) || records.length === 0) {
      status.textContent = "No records found in this response. Trigger another table page load.";
      return;
    }

    const sample = records.slice(0, 5).map((record, index) => ({
      sample: index + 1,
      record_keys: Object.keys(record || {}),
      institute: record?.institute ?? null,
      institute_keys: Object.keys(record?.institute || {})
    }));

    const report = {
      request,
      response_record_count: records.length,
      first_record: records[0],
      first_institute_object: records[0]?.institute ?? null,
      samples: sample
    };

    state.copyText = JSON.stringify(report, null, 2);
    state.captured = true;
    copy.disabled = false;
    copy.style.opacity = "1";
    status.textContent = "Captured " + records.length + " records. Tap Copy inspection, then paste the result into this chat.";
    restore();
    console.info("[Zxtract diagnostics] Captured institute fields. Use the on-page Copy inspection button.");
  }

  function onLoadEnd() {
    try {
      inspect(this);
    } catch (error) {
      status.textContent = "Inspection failed: " + (error?.message || String(error));
      restore();
      console.error("[Zxtract diagnostics]", error);
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

  console.info("[Zxtract diagnostics] v1.1.0 installed. Use the on-page panel; no dev-tools output is required.");
})();
