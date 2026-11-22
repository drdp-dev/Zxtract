/**
 * Zxtract — Andhra Pradesh Management Quota (Zynerd)
 * Version: 1.0.0
 *
 * Load from the Zxtract bookmarklet launcher on the Zynerd allotments page.
 * Choose an output file, then trigger one page load manually.
 * Each subsequent Next click occurs only after the preceding page is saved.
 *
 * JSON fields: round, rank, ai_rank, counselling_rank, institute_id, institute, course, quota, category, state, inservice_candidate
 * POST /api_v2/allotments/table_data?counselling_id=4&offset=N
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_MANAGEMENT_QUOTA_V1_0_0__";
  const ENDPOINT = "/api_v2/allotments/table_data";
  const COUNSELLING_ID = "4";

  const alreadyInstalled = Object.keys(window).some(name =>
    name.startsWith("__ZXTRACT_AP_MANAGEMENT_QUOTA_V") &&
    window[name]?.installed
  );

  if (alreadyInstalled) {
    console.warn("[Zxtract] An earlier extractor is installed. Reload Zynerd before installing the extractor again.");
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
    closeButton: null,
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

  async function complete(message) {
    await append(state.hasRecords ? "\n]" : "]", false);
    cleanup(message + " Valid JSON file closed. XHR hooks removed.");
    if (state.closeButton) state.closeButton.style.display = "inline-block";
    if (state.startButton) state.startButton.style.display = "inline-block";
  }

  async function append(text, isRecordChunk = true) {
    const current = await state.file.getFile();
    const writer = await state.file.createWritable({ keepExistingData: true });
    try {
      await writer.seek(current.size);
      if (text && isRecordChunk && state.hasRecords) await writer.write(",\n");
      if (text) await writer.write(text);
      await writer.close();
      if (text && isRecordChunk) state.hasRecords = true;
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
        await complete("Complete. Saved final page (" + recordCount + " records).");
        return;
      }

      const next = document.querySelector('a[aria-label="Next page"]');
      if (!next) {
        await complete("Saved offset " + offset + ". Next control not found.");
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
        await complete("Saved offset " + offset + ". Next is disabled.");
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
      const formatted = JSON.stringify({
        round: record?.round ?? null,
        rank: record?.rank ?? null,
        ai_rank: record?.ai_rank ?? null,
        counselling_rank: record?.counselling_rank ?? null,
        institute_id: record?.institute?.id ?? null,
        institute: record?.institute?.name ?? null,
        course: record?.course?.name ?? null,
        quota: record?.quota?.name ?? null,
        category: record?.category ?? null,
        state: record?.state ?? null,
        inservice_candidate: record?.inservice_candidate ?? null
      }, null, 2);
      outputRecords.push("  " + formatted.replaceAll("\n", "\n  "));
    }

    finishPage(count, request.offset, outputRecords.join(",\n"));
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

  function installHooks() {
    proto.open = patchedOpen;
    proto.send = patchedSend;
  }

  function installPanel() {
    if (!document.body) {
      cleanup("Page body unavailable. Reload and run after the table loads.");
      return;
    }

    const panel = document.createElement("section");
    panel.id = "zxtract-ap-management-quota";
    panel.style.cssText =
      "position:fixed;z-index:2147483647;right:12px;bottom:12px;left:12px;" +
      "max-width:520px;margin-left:auto;padding:12px;background:#111827;color:#f9fafb;" +
      "border:1px solid #374151;border-radius:12px;box-shadow:0 4px 24px #0008;" +
      "font:13px/1.4 system-ui;";


    const dragHandle = document.createElement("div");
    dragHandle.setAttribute("aria-label", "Drag to move Zxtract");
    dragHandle.style.cssText = "height:18px;display:flex;align-items:center;justify-content:center;margin:-5px 0 7px;";
    const grip = document.createElement("div");
    grip.style.cssText = "width:42px;height:4px;border-radius:4px;background:#64748b;";
    dragHandle.appendChild(grip);

    const heading = document.createElement("div");
    heading.textContent = "Zxtract · Extractor";
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
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.style.cssText = "display:none;margin-left:8px;padding:8px 12px;border:1px solid #6b7280;border-radius:7px;background:#374151;color:white;font:600 13px system-ui;min-height:36px;";
    close.addEventListener("click", () => panel.remove());

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
            update("No file selected. Tap Select created file to try again.");
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
            suggestedName: "AP-MQ-2026-R1.json",
            types: [{
              description: "JSON",
              accept: { "application/json": [".json"] }
            }]
          });
        } catch (error) {
          if (error?.name === "AbortError") {
            state.recoverExistingFile = true;
            start.textContent = "Select created file";
            update("File created. Select the file to continue.");
          } else {
            update("File picker failed: " + (error?.name || "Error") + " — " + (error?.message || String(error)));
          }
          return;
        }
      }

      start.disabled = true;
      update("File selected. Opening file for writing…");
      let initial;
      try {
        initial = await handle.createWritable();
        update("File opened. Writing JSON header…");
        await initial.write("[\n");
        update("JSON header written. Finalizing file…");
        await initial.close();
      } catch (error) {
        try { await initial?.abort(); } catch (_) {}
        start.disabled = false;
        update("File initialization failed: " +
          (error?.name || "Error") + " — " + (error?.message || String(error)));
        console.error("[Zxtract] File initialization failed:", error);
        return;
      }
      start.disabled = false;

      state.file = handle;
      state.hasRecords = false;
      state.recoverExistingFile = false;
      start.textContent = "Choose file & start";
      state.queue = Promise.resolve();
      state.pages = 0;
      state.records = 0;
      state.errors = 0;
      state.active = true;
      start.style.display = "none";
      if (state.closeButton) state.closeButton.style.display = "none";
      installHooks();
      update("Capturing. Trigger one page load manually to start.");
    });

    panel.append(dragHandle, heading, status, stats, start, close);
    document.body.appendChild(panel);

function makeDraggable(panel, handle) {
    const storageKey = "zxtract-position-ap-management-quota-v1";
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

    state.status = status;
    state.stats = stats;
    state.startButton = start;
    state.closeButton = close;
    update("Ready. Choose an output file.");
  }

  installPanel();
  console.info("[Zxtract] v1.0.0 installed. Writes a pretty-printed JSON array incrementally, includes Android file-picker recovery, and offers Close after completion.");
})();
