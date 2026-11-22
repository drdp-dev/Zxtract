/**
 * Zxtract diagnostics — inspect Zynerd institute fields
 * Version: 1.3.0
 *
 * Load this from the Zxtract bookmarklet launcher on the Andhra Pradesh
 * Government Quota page. It creates its own on-page panel; no Eruda or
 * developer console is required. Trigger one table page load, then tap Copy
 * inspection to copy the captured institute fields for sharing.
 *
 * Endpoint:
 * POST /api_v2/allotments/table_data?counselling_id=3&offset=N
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_INSTITUTE_DIAGNOSTICS_V1_3__";
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

    const dragHandle = document.createElement("div");
    dragHandle.setAttribute("aria-label", "Drag to move Zxtract");
    dragHandle.style.cssText = "height:18px;display:flex;align-items:center;justify-content:center;margin:-5px 0 7px;";
    const grip = document.createElement("div");
    grip.style.cssText = "width:42px;height:4px;border-radius:4px;background:#64748b;";
    dragHandle.appendChild(grip);

  const heading = document.createElement("div");
  heading.textContent = "Zxtract · Diagnostics";
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
  panel.append(dragHandle, heading, status, actions);
  document.body.appendChild(panel);

function makeDraggable(panel, handle) {
    const storageKey = "zxtract-position-institute-diagnostics-v1";
    const readPosition = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
        if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) return saved;
      } catch (_) {}
      return null;
    };
    const savePosition = () => {
      const rect = panel.getBoundingClientRect();
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          left: Math.round(rect.left),
          top: Math.round(rect.top)
        }));
      } catch (_) {}
    };
    const applyPosition = (left, top) => {
      const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
      const x = Math.min(maxLeft, Math.max(0, left));
      const y = Math.min(maxTop, Math.max(0, top));
      panel.style.left = x + "px";
      panel.style.top = y + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.margin = "0";
    };

    const saved = readPosition();
    if (saved) applyPosition(saved.left, saved.top);

    let drag = null;
    handle.style.cssText += ";touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;";
    handle.addEventListener("pointerdown", event => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      const rect = panel.getBoundingClientRect();
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      applyPosition(rect.left, rect.top);
      handle.style.cursor = "grabbing";
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    });
    handle.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      applyPosition(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
    });
    const stop = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      handle.style.cursor = "grab";
      savePosition();
    };
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    window.addEventListener("resize", () => {
      const rect = panel.getBoundingClientRect();
      applyPosition(rect.left, rect.top);
      if (saved || panel.dataset.zxtractMoved === "true") savePosition();
    });
    handle.addEventListener("pointerdown", () => { panel.dataset.zxtractMoved = "true"; });
  }


  makeDraggable(panel, dragHandle);
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
    console.info("[Zxtract diagnostics] Captured API response. Use the on-page Copy inspection button.");
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

  console.info("[Zxtract diagnostics] v1.3.0 installed. Use the on-page panel; no dev-tools output is required.");
})();
