/**
 * Zxtract — Andhra Pradesh Government Quota (Zynerd)
 * Version: 1.0.0
 *
 * HOW TO RUN
 * 1. Open the Zynerd seat-differences table in Android Chrome.
 * 2. Open Eruda Console and paste this entire file.
 * 3. Use the on-page Zxtract panel to choose an output .jsonl file.
 * 4. Paginate through the table normally. Each matching XHR page is saved.
 *
 * IMPORTANT
 * - This hooks XMLHttpRequest only; the known Zynerd table uses POST XHR.
 * - Start capture before changing pages.
 * - Choosing an existing file truncates it at start. Choose a new file to
 *   preserve any previous capture.
 * - The script captures records as returned by the API and adds _zxtract
 *   metadata. It does not alter the site's requests or responses.
 */

(() => {
  "use strict";

  const GLOBAL_KEY = "__ZXTRACT_AP_GOVERNMENT_QUOTA_V1__";
  const ENDPOINT_PATH = "/api_v2/seat_differences/table_data";
  const RECORDS_PATH = ["data", "records"];

  if (window[GLOBAL_KEY]?.installed) {
    console.warn("[Zxtract] Extractor is already installed on this page.");
    return;
  }

  if (!window.XMLHttpRequest || !XMLHttpRequest.prototype) {
    console.error("[Zxtract] XMLHttpRequest is unavailable.");
    return;
  }

  const state = {
    installed: false,
    active: false,
    fileHandle: null,
    writeQueue: Promise.resolve(),
    seenPages: new Set(),
    pagesWritten: 0,
    recordsWritten: 0,
    duplicatePages: 0,
    errors: 0,
    lastOffset: null,
    panel: null,
    status: null,
    stats: null,
    startButton: null,
    pauseButton: null,
    resumeButton: null,
    stopButton: null,
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  function updateUI(message) {
    if (state.status) state.status.textContent = message;
    if (state.stats) {
      state.stats.textContent =
        "Pages: " + state.pagesWritten +
        " | Records: " + state.recordsWritten +
        " | Duplicate pages: " + state.duplicatePages +
        " | Errors: " + state.errors +
        (state.lastOffset === null ? "" : " | Last offset: " + state.lastOffset);
    }
    if (state.startButton) state.startButton.disabled = state.active;
    if (state.pauseButton) state.pauseButton.disabled = !state.active;
    if (state.resumeButton) state.resumeButton.disabled = state.active || !state.fileHandle;
    if (state.stopButton) state.stopButton.disabled = !state.fileHandle;
  }

  function getRecords(payload) {
    let value = payload;
    for (const key of RECORDS_PATH) {
      if (!value || typeof value !== "object") return null;
      value = value[key];
    }
    return Array.isArray(value) ? value : null;
  }

  function getPayload(xhr) {
    try {
      if (xhr.responseType === "json" && xhr.response && typeof xhr.response === "object") {
        return xhr.response;
      }
      if (typeof xhr.responseText === "string" && xhr.responseText.length) {
        return JSON.parse(xhr.responseText);
      }
      if (xhr.response && typeof xhr.response === "object") {
        return xhr.response;
      }
    } catch (error) {
      console.warn("[Zxtract] Could not parse matching XHR response:", error);
    }
    return null;
  }

  function makePageKey(requestInfo, records) {
    const offset = requestInfo.offset === null ? "unknown" : String(requestInfo.offset);
    const body = typeof requestInfo.body === "string" ? requestInfo.body : "";
    if (body.length <= 1500) return offset + "|" + body;
    return offset + "|" + body.slice(0, 1500);
  }

  async function appendText(text) {
    const handle = state.fileHandle;
    if (!handle) throw new Error("No output file selected.");

    const existingFile = await handle.getFile();
    const writable = await handle.createWritable({ keepExistingData: true });
    try {
      await writable.seek(existingFile.size);
      await writable.write(text);
      await writable.close();
    } catch (error) {
      try { await writable.abort(); } catch (_) {}
      throw error;
    }
  }

  function queuePage(records, requestInfo) {
    const pageKey = makePageKey(requestInfo, records);

    if (state.seenPages.has(pageKey)) {
      state.duplicatePages += 1;
      updateUI("Skipped a page already captured (offset " + requestInfo.offset + ").");
      return;
    }

    // Reserve the page key before queuing so simultaneous duplicate responses
    // cannot enqueue the same page twice. Release it if the write fails.
    state.seenPages.add(pageKey);

    const capturedAt = new Date().toISOString();
    const offset = requestInfo.offset;
    const lines = records.map((record, index) => {
      const outputRecord =
        record && typeof record === "object" && !Array.isArray(record)
          ? { ...record }
          : { value: record };

      outputRecord._zxtract = {
        extractor: "allotments.andhra-pradesh.government-quota",
        source: "Zynerd",
        endpoint: ENDPOINT_PATH,
        offset,
        rowIndex: index,
        capturedAt,
      };

      return JSON.stringify(outputRecord);
    });

    const pageText = lines.length ? lines.join("\n") + "\n" : "";

    state.writeQueue = state.writeQueue.then(async () => {
      if (!pageText) {
        state.pagesWritten += 1;
        state.lastOffset = offset;
        updateUI("Processed empty page at offset " + offset + ".");
        return;
      }

      await appendText(pageText);
      state.pagesWritten += 1;
      state.recordsWritten += records.length;
      state.lastOffset = offset;
      updateUI("Saved " + records.length + " records from offset " + offset + ".");
    }).catch((error) => {
      state.seenPages.delete(pageKey);
      state.errors += 1;
      updateUI("WRITE ERROR: " + (error?.message || String(error)));
      console.error("[Zxtract] File write failed:", error);
    });
  }

  function handleXhrResponse(xhr) {
    const requestInfo = xhr.__zxtractRequest;
    if (!requestInfo || !state.active || xhr.status < 200 || xhr.status >= 300) return;

    const payload = getPayload(xhr);
    if (!payload) return;

    const records = getRecords(payload);
    if (!records) {
      console.warn("[Zxtract] Matching endpoint response did not contain data.records.");
      return;
    }

    queuePage(records, requestInfo);
  }

  XMLHttpRequest.prototype.open = function(method, url) {
    try {
      const parsed = new URL(String(url), window.location.href);
      this.__zxtractRequest = parsed.pathname.includes(ENDPOINT_PATH)
        ? {
            method: String(method || "GET").toUpperCase(),
            url: parsed.href,
            offset: parsed.searchParams.has("offset")
              ? Number(parsed.searchParams.get("offset"))
              : null,
            body: "",
          }
        : null;
    } catch (_) {
      this.__zxtractRequest = null;
    }
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const requestInfo = this.__zxtractRequest;
    if (requestInfo) {
      requestInfo.body = typeof body === "string" ? body : "";
      this.addEventListener("loadend", () => {
        try {
          handleXhrResponse(this);
        } catch (error) {
          state.errors += 1;
          updateUI("CAPTURE ERROR: " + (error?.message || String(error)));
          console.error("[Zxtract] Response processing failed:", error);
        }
      }, { once: true });
    }
    return originalSend.apply(this, arguments);
  };

  function createButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText =
      "padding:8px 10px;border:0;border-radius:7px;background:#2563eb;color:#fff;" +
      "font:600 13px system-ui;min-height:36px;";
    button.addEventListener("click", onClick);
    return button;
  }

  function installPanel() {
    if (!document.body) {
      console.error("[Zxtract] document.body is unavailable. Run the script again after the page loads.");
      return;
    }

    const panel = document.createElement("section");
    panel.id = "zxtract-ap-gq-panel";
    panel.style.cssText =
      "position:fixed;z-index:2147483647;right:12px;bottom:12px;left:12px;" +
      "max-width:520px;margin-left:auto;padding:12px;background:#111827;color:#f9fafb;" +
      "border:1px solid #374151;border-radius:12px;box-shadow:0 4px 24px #0008;" +
      "font:13px/1.4 system-ui;";

    const heading = document.createElement("div");
    heading.textContent = "Zxtract · Andhra Pradesh Government Quota";
    heading.style.cssText = "font-weight:700;margin-bottom:7px;";

    const status = document.createElement("div");
    status.textContent = "Installed. Choose a file to begin capturing.";
    status.style.cssText = "margin-bottom:7px;color:#bfdbfe;";

    const stats = document.createElement("div");
    stats.textContent = "Pages: 0 | Records: 0 | Duplicate pages: 0 | Errors: 0";
    stats.style.cssText = "font-size:11px;color:#d1d5db;margin-bottom:9px;";

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;flex-wrap:wrap;gap:7px;";

    const startButton = createButton("Choose file & start", async () => {
      if (!window.showSaveFilePicker) {
        updateUI("File picker API unavailable. Use a supported secure Android Chrome context.");
        return;
      }

      try {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const handle = await window.showSaveFilePicker({
          suggestedName: "andhra-pradesh-government-quota-" + stamp + ".jsonl",
          types: [{ description: "JSON Lines", accept: { "application/json": [".jsonl"] } }],
        });

        // Start a fresh capture file. If an existing file is selected, its
        // contents are intentionally replaced; choose a new filename to retain old data.
        const initialWriter = await handle.createWritable();
        await initialWriter.close();

        state.fileHandle = handle;
        state.seenPages.clear();
        state.pagesWritten = 0;
        state.recordsWritten = 0;
        state.duplicatePages = 0;
        state.errors = 0;
        state.lastOffset = null;
        state.writeQueue = Promise.resolve();
        state.active = true;
        updateUI("Capturing. Paginate through the Zynerd table now.");
      } catch (error) {
        if (error?.name === "AbortError") {
          updateUI("File selection cancelled.");
        } else {
          updateUI("Could not open output file: " + (error?.message || String(error)));
          console.error("[Zxtract] File selection failed:", error);
        }
      }
    });

    const pauseButton = createButton("Pause", () => {
      state.active = false;
      updateUI("Paused. In-flight responses received after pausing will not be captured.");
    });

    const resumeButton = createButton("Resume", () => {
      if (!state.fileHandle) return;
      state.active = true;
      updateUI("Capturing resumed. Continue paginating.");
    });

    const stopButton = createButton("Stop", async () => {
      state.active = false;
      await state.writeQueue;
      updateUI("Stopped. File writes are complete; the JSONL file is ready.");
    });

    const closeButton = createButton("Hide", () => panel.remove());
    closeButton.style.background = "#4b5563";

    controls.append(startButton, pauseButton, resumeButton, stopButton, closeButton);
    panel.append(heading, status, stats, controls);
    document.body.appendChild(panel);

    state.panel = panel;
    state.status = status;
    state.stats = stats;
    state.startButton = startButton;
    state.pauseButton = pauseButton;
    state.resumeButton = resumeButton;
    state.stopButton = stopButton;
    updateUI("Installed. Choose a file to begin capturing.");
  }

  state.installed = true;
  window[GLOBAL_KEY] = state;
  installPanel();

  console.info(
    "[Zxtract] Andhra Pradesh Government Quota extractor installed. " +
    "Choose a file in the on-page panel, then paginate the table."
  );
})();
