/**
 * Zxtract — Andhra Pradesh Government Quota (Zynerd)
 * Version: 1.3.0
 *
 * Run in Eruda Console after the Zynerd allotments table loads.
 * Choose an output file, then trigger one page load manually.
 * Each subsequent Next click occurs only after the preceding page is saved.
 *
 * JSONL fields: rank, institute_id, institute, course, quota, category
 * POST /api_v2/allotments/table_data?counselling_id=3&offset=N
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_3__";
  const ENDPOINT = "/api_v2/allotments/table_data";
  const COUNSELLING_ID = "3";

  if (
    window[KEY]?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_2__?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_1__?.installed
  ) {
    console.warn("[Zxtract] An earlier extractor is installed. Reload Zynerd before installing v1.3.0.");
    return;
  }

  if (!window.XMLHttpRequest) {
    console.error("[Zxtract] XMLHttpRequest unavailable.");
    return;
  }

  const state = {
    installed: true,
    active: false,
    file: null,
    queue: Promise.resolve(),
    pages: 0,
    records: 0,
    errors: 0,
    status: null,
    stats: null,
    buttons: {}
  };
  window[KEY] = state;

  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  let patchedOpen;
  let patchedSend;

  function update(message) {
    if (state.status) state.status.textContent = message;
    if (state.stats) {
      state.stats.textContent = "Pages " + state.pages +
        " · Records " + state.records + " · Errors " + state.errors;
    }
    if (state.buttons.start) {
      state.buttons.start.disabled = state.active;
      state.buttons.pause.disabled = !state.active;
      state.buttons.resume.disabled = state.active || !state.file;
      state.buttons.stop.disabled = !state.file;
    }
  }

  function cleanup(message) {
    state.active = false;
    if (proto.open === patchedOpen) proto.open = originalOpen;
    if (proto.send === patchedSend) proto.send = originalSend;
    update(message || "Stopped. XHR hooks removed.");
  }

  async function append(text) {
    const current = await state.file.getFile();
    const writer = await state.file.createWritable({ keepExistingData: true });
    try {
      await writer.seek(current.size);
      await writer.write(text);
      await writer.close();
    } catch (error) {
      try { await writer.abort(); } catch (_) {}
      throw error;
    }
  }

  function finishPage(recordCount, offset, output) {
    state.queue = state.queue.then(async () => {
      if (output) await append(output);

      state.pages++;
      state.records += recordCount;
      update("Saved " + recordCount + " records from offset " + offset + ".");

      if (!state.active) return;

      if (recordCount < 50) {
        cleanup("Complete. Saved final page (" + recordCount + " records). XHR hooks removed.");
        return;
      }

      const next = document.querySelector('a[aria-label="Next page"]');
      if (!next) {
        cleanup("Saved offset " + offset + ". Next control not found; stopped safely.");
        return;
      }

      const parent = next.parentElement;
      const disabled =
        next.getAttribute("aria-disabled") === "true" ||
        next.hasAttribute("disabled") ||
        next.getAttribute("tabindex") === "-1" ||
        parent?.getAttribute("aria-disabled") === "true" ||
        /disabled/i.test(String(next.className) + " " + String(parent?.className || ""));

      if (disabled) {
        cleanup("Saved offset " + offset + ". Next is disabled; capture complete. XHR hooks removed.");
        return;
      }

      update("Saved offset " + offset + ". Loading next page…");
      next.click();
    }).catch(error => {
      state.errors++;
      cleanup("Write failed; automatic pagination stopped. " + (error?.message || String(error)));
      console.error("[Zxtract] Write failed:", error);
    });
  }

  function parseAndQueue(xhr) {
    const request = xhr.__zxtractRequest;
    xhr.__zxtractRequest = null;

    if (!state.active || !request || request.method !== "POST") return;
    if (xhr.status < 200 || xhr.status >= 300) {
      state.errors++;
      update("Request failed at offset " + request.offset + " (HTTP " + xhr.status + ").");
      return;
    }

    let payload = null;
    try {
      if (xhr.responseType === "json" && xhr.response && typeof xhr.response === "object") {
        payload = xhr.response;
      } else if (typeof xhr.responseText === "string" && xhr.responseText) {
        payload = JSON.parse(xhr.responseText);
      } else if (xhr.response && typeof xhr.response === "object") {
        payload = xhr.response;
      }
    } catch (error) {
      state.errors++;
      update("Could not parse response at offset " + request.offset + ".");
      console.warn("[Zxtract] Response parse failed:", error);
      return;
    }

    const records = payload?.data?.records;
    if (!Array.isArray(records)) {
      state.errors++;
      update("Response at offset " + request.offset + " has no data.records array.");
      return;
    }

    // Build only the final JSONL string. Do not retain the API records in the write queue.
    let output = "";
    const count = records.length;
    for (let i = 0; i < count; i++) {
      const record = records[i];
      output += JSON.stringify({
        rank: record?.rank ?? null,
        institute_id: record?.institute?.id ?? null,
        institute: record?.institute?.name ?? null,
        course: record?.course?.name ?? null,
        quota: record?.quota?.name ?? null,
        category: record?.category ?? null
      }) + "\n";
    }

    finishPage(count, request.offset, output);
    payload = null;
  }

  // Shared handler: uses event.currentTarget/this and does not close over an XHR object.
  function onLoadEnd() {
    try {
      parseAndQueue(this);
    } catch (error) {
      state.errors++;
      cleanup("Capture failed; XHR hooks removed. " + (error?.message || String(error)));
      console.error("[Zxtract] Capture failed:", error);
    }
  }

  patchedOpen = function(method, url) {
    this.__zxtractRequest = null;
    if (state.active) {
      try {
        const parsed = new URL(String(url), location.href);
        if (
          parsed.pathname === ENDPOINT &&
          parsed.searchParams.get("counselling_id") === COUNSELLING_ID
        ) {
          this.__zxtractRequest = {
            method: String(method || "GET").toUpperCase(),
            offset: Number(parsed.searchParams.get("offset") || 0)
          };
        }
      } catch (_) {}
    }
    return originalOpen.apply(this, arguments);
  };

  patchedSend = function() {
    if (this.__zxtractRequest) {
      this.addEventListener("loadend", onLoadEnd, { once: true });
    }
    return originalSend.apply(this, arguments);
  };

  proto.open = patchedOpen;
  proto.send = patchedSend;

  function button(label, action, color) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.style.cssText =
      "padding:8px 10px;border:0;border-radius:7px;background:" +
      (color || "#2563eb") +
      ";color:white;font:600 13px system-ui;min-height:36px;";
    element.addEventListener("click", action);
    return element;
  }

  function installPanel() {
    if (!document.body) {
      cleanup("Page body unavailable. Reload and run after the table loads.");
      return;
    }

    const panel = document.createElement("section");
    panel.id = "zxtract-ap-government-quota";
    panel.style.cssText =
      "position:fixed;z-index:2147483647;right:12px;bottom:12px;left:12px;" +
      "max-width:520px;margin-left:auto;padding:12px;background:#111827;color:#f9fafb;" +
      "border:1px solid #374151;border-radius:12px;box-shadow:0 4px 24px #0008;" +
      "font:13px/1.4 system-ui;";

    const heading = document.createElement("div");
    heading.textContent = "Zxtract · AP Government Quota";
    heading.style.cssText = "font-weight:700;margin-bottom:7px;";

    const status = document.createElement("div");
    status.style.cssText = "margin-bottom:7px;color:#bfdbfe;";
    status.textContent = "Ready. Choose an output file.";

    const stats = document.createElement("div");
    stats.style.cssText = "font-size:11px;color:#d1d5db;margin-bottom:9px;";
    stats.textContent = "Pages 0 · Records 0 · Errors 0";

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;flex-wrap:wrap;gap:7px;";

    const start = button("Choose file & start", async () => {
      if (!window.showSaveFilePicker) {
        update("File picker API unavailable in this browser context.");
        return;
      }
      try {
        const date = new Date().toISOString().slice(0, 10);
        const handle = await window.showSaveFilePicker({
          suggestedName: "andhra-pradesh-government-quota-" + date + ".jsonl",
          types: [{
            description: "JSON Lines",
            accept: { "text/plain": [".jsonl"] }
          }]
        });
        const initial = await handle.createWritable();
        await initial.close();

        state.file = handle;
        state.queue = Promise.resolve();
        state.pages = 0;
        state.records = 0;
        state.errors = 0;
        state.active = true;
        update("Capturing. Trigger one page load manually to start.");
      } catch (error) {
        if (error?.name === "AbortError") update("File selection cancelled.");
        else update("Could not open file: " + (error?.message || String(error)));
      }
    });

    const pause = button("Pause", () => {
      state.active = false;
      update("Paused. Resume, then click Next manually to continue.");
    });

    const resume = button("Resume", () => {
      if (!state.file) return;
      state.active = true;
      update("Resumed. Click Next once to continue capture.");
    });

    const stop = button("Stop", async () => {
      state.active = false;
      await state.queue;
      cleanup("Stopped. All queued writes finished; XHR hooks removed.");
    });

    const hide = button("Hide", () => panel.remove(), "#4b5563");
    controls.append(start, pause, resume, stop, hide);
    panel.append(heading, status, stats, controls);
    document.body.appendChild(panel);

    state.status = status;
    state.stats = stats;
    state.buttons = { start, pause, resume, stop };
    update("Ready. Choose an output file.");
  }

  installPanel();
  console.info("[Zxtract] v1.3.0 installed. Minimal capture mode; XHR hooks are removed on stop or completion.");
})();
