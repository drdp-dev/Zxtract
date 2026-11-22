/**
 * Zxtract — Andhra Pradesh Government Quota (Zynerd)
 * Version: 1.2.0
 *
 * Run: paste this complete file into Eruda Console on the Zynerd allotments
 * table, execute it, choose an output file, then trigger one page load manually. The script
 * automatically clicks Next after each page has been fully saved.
 *
 * Output: JSONL with exactly six fields:
 * rank, institute_id, institute, course, quota, category
 *
 * Confirmed endpoint:
 * POST /api_v2/allotments/table_data?counselling_id=3&offset=N
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_2__";
  const ENDPOINT = "/api_v2/allotments/table_data";
  const COUNSELLING_ID = "3";

  if (window[KEY]?.installed || window.__ZXTRACT_AP_GOVERNMENT_QUOTA_V1_1__?.installed) {
    console.warn("[Zxtract] An earlier Zxtract version is installed. Reload the page before installing v1.2.0.");
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
    seenOffsets: new Set(),
    pages: 0,
    records: 0,
    duplicates: 0,
    errors: 0,
    lastOffset: null,
    panel: null,
    status: null,
    stats: null,
    buttons: {}
  };

  window[KEY] = state;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  function update(message) {
    if (state.status) state.status.textContent = message;
    if (state.stats) {
      state.stats.textContent =
        "Pages " + state.pages +
        " · Records " + state.records +
        " · Duplicate pages " + state.duplicates +
        " · Errors " + state.errors +
        (state.lastOffset === null ? "" : " · Offset " + state.lastOffset);
    }
    state.buttons.start.disabled = state.active;
    state.buttons.pause.disabled = !state.active;
    state.buttons.resume.disabled = state.active || !state.file;
    state.buttons.stop.disabled = !state.file;
  }

  function parseResponse(xhr) {
    try {
      if (xhr.responseType === "json" && xhr.response && typeof xhr.response === "object") {
        return xhr.response;
      }
      if (typeof xhr.responseText === "string" && xhr.responseText) {
        return JSON.parse(xhr.responseText);
      }
      if (xhr.response && typeof xhr.response === "object") return xhr.response;
    } catch (_) {}
    return null;
  }

  async function append(text) {
    if (!state.file) throw new Error("No output file selected.");
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

  function clickNext(savedCount, offset) {
    if (!state.active) return;

    // A short page is the final page; do not advance.
    if (savedCount < 50) {
      state.active = false;
      update("Complete. Saved final page (" + savedCount + " records).");
      return;
    }

    const next = document.querySelector('a[aria-label="Next page"]');
    if (!next) {
      state.active = false;
      update("Saved offset " + offset + ". Next control not found; stopped safely.");
      return;
    }

    const disabled =
      next.getAttribute("aria-disabled") === "true" ||
      next.hasAttribute("disabled") ||
      !!next.closest('[aria-disabled="true"]') ||
      /disabled/i.test(String(next.className) + " " + String(next.parentElement?.className || ""));

    if (disabled) {
      state.active = false;
      update("Saved offset " + offset + ". Next page is disabled; capture complete.");
      return;
    }

    update("Saved offset " + offset + ". Loading next page…");
    next.click();
  }

  function capture(records, offset) {
    if (state.seenOffsets.has(offset)) {
      state.duplicates++;
      update("Skipped duplicate page at offset " + offset + ".");
      return;
    }

    state.seenOffsets.add(offset);

    // Project each API record immediately to the six requested scalar fields.
    const lines = records.map(record => JSON.stringify({
      rank: record?.rank ?? null,
      institute_id: record?.institute?.id ?? null,
      institute: record?.institute?.name ?? null,
      course: record?.course?.name ?? null,
      quota: record?.quota?.name ?? null,
      category: record?.category ?? null
    }));

    const output = lines.length ? lines.join("\n") + "\n" : "";

    state.queue = state.queue.then(async () => {
      if (output) await append(output);
      state.pages++;
      state.records += records.length;
      state.lastOffset = offset;
      update("Saved " + records.length + " records from offset " + offset + ".");
      // append() closes the file writer before the Next click is attempted.
      clickNext(records.length, offset);
    }).catch(error => {
      state.seenOffsets.delete(offset);
      state.errors++;
      state.active = false;
      update("Write failed; automatic pagination stopped: " + (error?.message || String(error)));
      console.error("[Zxtract] Write failed:", error);
    });
  }

  function inspect(xhr) {
    const request = xhr.__zxtractRequest;
    if (!state.active || !request || request.method !== "POST" || xhr.status < 200 || xhr.status >= 300) return;

    const payload = parseResponse(xhr);
    const records = payload?.data?.records;

    if (!Array.isArray(records)) {
      console.warn("[Zxtract] Matching response has no data.records array.");
      return;
    }

    capture(records, request.offset);
  }

  XMLHttpRequest.prototype.open = function(method, url) {
    try {
      const parsed = new URL(String(url), location.href);
      const matches =
        parsed.pathname === ENDPOINT &&
        parsed.searchParams.get("counselling_id") === COUNSELLING_ID;

      this.__zxtractRequest = matches
        ? {
            method: String(method || "GET").toUpperCase(),
            offset: Number(parsed.searchParams.get("offset") || 0)
          }
        : null;
    } catch (_) {
      this.__zxtractRequest = null;
    }
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    if (this.__zxtractRequest) {
      this.addEventListener("loadend", () => {
        try {
          inspect(this);
        } catch (error) {
          state.errors++;
          update("Capture error: " + (error?.message || String(error)));
          console.error("[Zxtract] Capture error:", error);
        }
      }, { once: true });
    }
    return originalSend.apply(this, arguments);
  };

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
      console.error("[Zxtract] Page body unavailable. Run after the table loads.");
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
    stats.textContent = "Pages 0 · Records 0 · Duplicate pages 0 · Errors 0";

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

        // A newly selected capture starts from an empty file.
        const initial = await handle.createWritable();
        await initial.close();

        state.file = handle;
        state.queue = Promise.resolve();
        state.seenOffsets.clear();
        state.pages = 0;
        state.records = 0;
        state.duplicates = 0;
        state.errors = 0;
        state.lastOffset = null;
        state.active = true;
        update("Capturing. Paginate through the Zynerd table.");
      } catch (error) {
        if (error?.name === "AbortError") update("File selection cancelled.");
        else update("Could not open file: " + (error?.message || String(error)));
      }
    });

    const pause = button("Pause", () => {
      state.active = false;
      update("Paused.");
    });

    const resume = button("Resume", () => {
      if (!state.file) return;
      state.active = true;
      update("Capture resumed.");
    });

    const stop = button("Stop", async () => {
      state.active = false;
      await state.queue;
      update("Stopped. All queued writes have finished.");
    });

    const hide = button("Hide", () => panel.remove(), "#4b5563");

    controls.append(start, pause, resume, stop, hide);
    panel.append(heading, status, stats, controls);
    document.body.appendChild(panel);

    state.panel = panel;
    state.status = status;
    state.stats = stats;
    state.buttons = { start, pause, resume, stop };
    update("Ready. Choose an output file.");
  }

  installPanel();
  console.info("[Zxtract] v1.2.0 installed. Trigger one page manually; Next is clicked only after its records are saved.");
})();
