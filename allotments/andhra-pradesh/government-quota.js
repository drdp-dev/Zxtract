/**
 * Zxtract — Andhra Pradesh Government Quota (Zynerd)
 * Version: 1.5.0
 *
 * Run in Eruda Console after the Zynerd allotments table loads.
 * Choose an output file, then trigger one page load manually.
 * Each subsequent Next click occurs only after the preceding page is saved.
 *
 * JSON fields: rank, institute_id, institute, course, quota, category
 * POST /api_v2/allotments/table_data?counselling_id=3&offset=N
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_5_0__";
  const ENDPOINT = "/api_v2/allotments/table_data";
  const COUNSELLING_ID = "3";

  if (
    window[KEY]?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_4_2__?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_4_1__?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_4__?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_3__?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_2__?.installed ||
    window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_1__?.installed
  ) {
    console.warn("[Zxtract] An earlier extractor is installed. Reload Zynerd before installing v1.5.0.");
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
    startButton: null,
    recoverExistingFile: false,
    hasRecords: false
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
    if (state.startButton) state.startButton.disabled = state.active;
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
      if (text && state.hasRecords) await writer.write(",");
      if (text) await writer.write(text);
      await writer.close();
      if (text) state.hasRecords = true;
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
        await append("]");
        cleanup("Complete. Saved final page (" + recordCount + " records). Valid JSON file closed. XHR hooks removed.");
        return;
      }

      const next = document.querySelector('a[aria-label="Next page"]');
      if (!next) {
        await append("]");
        cleanup("Saved offset " + offset + ". Next control not found; valid JSON file closed.");
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
        await append("]");
        cleanup("Saved offset " + offset + ". Next is disabled; valid JSON file closed. XHR hooks removed.");
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
      cleanup("Request failed at offset " + request.offset + " (HTTP " + xhr.status + "). Capture stopped.");
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
      cleanup("Could not parse response at offset " + request.offset + ". Capture stopped.");
      console.warn("[Zxtract] Response parse failed:", error);
      return;
    }

    const records = payload?.data?.records;
    if (!Array.isArray(records)) {
      state.errors++;
      cleanup("Response at offset " + request.offset + " has no data.records array. Capture stopped.");
      return;
    }

    // Build only the final JSON fragment. Do not retain the API records in the write queue.
    const outputRecords = [];
    const count = records.length;
    for (let i = 0; i < count; i++) {
      const record = records[i];
      outputRecords.push(JSON.stringify({
        rank: record?.rank ?? null,
        institute_id: record?.institute?.id ?? null,
        institute: record?.institute?.name ?? null,
        course: record?.course?.name ?? null,
        quota: record?.quota?.name ?? null,
        category: record?.category ?? null
      }));
    }

    finishPage(count, request.offset, outputRecords.join(","));
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


    const start = document.createElement("button");
    start.type = "button";
    start.textContent = "Choose file & start";
    start.style.cssText = "padding:8px 10px;border:0;border-radius:7px;background:#2563eb;color:white;font:600 13px system-ui;min-height:36px;";
    start.addEventListener("click", async () => {
      let handle;

      // Android file-manager providers can create the requested file but still
      // reject showSaveFilePicker() with AbortError instead of returning its handle.
      // Offer a second, user-initiated picker to reopen that created file.
      if (state.recoverExistingFile) {
        if (!window.showOpenFilePicker) {
          update("This browser cannot reopen the created file. Reload and try a new filename.");
          return;
        }
        try {
          const [selected] = await window.showOpenFilePicker({
            multiple: false,
            types: [{
              description: "JSON",
              accept: { "application/json": [".json"] }
            }]
          });
          handle = selected;
        } catch (error) {
          if (error?.name === "AbortError") {
            update("No file selected. Tap Select saved file to try again.");
          } else {
            update("Could not reopen file: " + (error?.name || "Error") + " — " + (error?.message || String(error)));
          }
          return;
        }
      } else {
        if (!window.showSaveFilePicker) {
          update("File picker API unavailable in this browser context.");
          return;
        }
        try {
          const date = new Date().toISOString().slice(0, 10);
          handle = await window.showSaveFilePicker({
            suggestedName: "R1.json",
            types: [{
              description: "JSON",
              accept: { "application/json": [".json"] }
            }]
          });
        } catch (error) {
          if (error?.name === "AbortError") {
            state.recoverExistingFile = true;
            start.textContent = "Select saved file";
            update("The Android file picker closed without returning its file handle. If it created the file, tap Select saved file and choose it.");
          } else {
            update("File picker failed: " + (error?.name || "Error") + " — " + (error?.message || String(error)));
          }
          return;
        }
      }

      update("File selected. Initializing output file…");
      try {
        const initial = await handle.createWritable();
        await initial.write("[");
        await initial.close();
      } catch (error) {
        update("File selected, but initialization failed: " +
          (error?.name || "Error") + " — " + (error?.message || String(error)));
        console.error("[Zxtract] File initialization failed:", error);
        return;
      }

      state.file = handle;
      state.hasRecords = false;
      state.recoverExistingFile = false;
      start.textContent = "Choose file & start";
      state.queue = Promise.resolve();
      state.pages = 0;
      state.records = 0;
      state.errors = 0;
      state.active = true;
      update("Capturing. Trigger one page load manually to start.");
    });

    panel.append(heading, status, stats, start);
    document.body.appendChild(panel);

    state.status = status;
    state.stats = stats;
    state.startButton = start;
    update("Ready. Choose an output file.");
  }

  installPanel();
  console.info("[Zxtract] v1.5.0 installed. Writes a valid JSON array incrementally and includes Android file-picker recovery.");
})();
