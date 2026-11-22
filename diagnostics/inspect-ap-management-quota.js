/**
 * Zxtract diagnostics — Andhra Pradesh Management Quota
 * Version: 1.0.0
 *
 * Install on the AP PG Medical Management Quota allotment/results page.
 * Trigger a table refresh or move to another page, then use Copy inspection.
 * Captures request metadata and JSON response structure without copying candidate
 * names, contact details, or arbitrary personal values.
 */

(() => {
  "use strict";

  const KEY = "__ZXTRACT_AP_MQ_DIAGNOSTICS_V1__";
  if (window[KEY]?.installed) {
    alert("AP MQ diagnostics are already installed. Reload the page before running again.");
    return;
  }

  const state = { installed: true, entries: [], copyText: "", panel: null };
  window[KEY] = state;

  const panel = document.createElement("section");
  panel.style.cssText =
    "position:fixed;z-index:2147483647;right:12px;bottom:12px;left:12px;" +
    "max-width:540px;margin-left:auto;padding:12px;background:#111827;color:#f9fafb;" +
    "border:1px solid #374151;border-radius:12px;box-shadow:0 4px 24px #0008;" +
    "font:13px/1.45 system-ui;";

  const handle = document.createElement("div");
  handle.style.cssText = "height:18px;display:flex;align-items:center;justify-content:center;margin:-5px 0 7px;touch-action:none;cursor:grab;";
  handle.setAttribute("aria-label", "Drag to move Zxtract");
  const grip = document.createElement("div");
  grip.style.cssText = "width:42px;height:4px;border-radius:4px;background:#64748b;";
  handle.appendChild(grip);

  const heading = document.createElement("div");
  heading.textContent = "Zxtract · AP MQ Diagnostics";
  heading.style.cssText = "font-weight:700;margin-bottom:7px;";
  const status = document.createElement("div");
  status.textContent = "Installed. Refresh the allotment table or change its page to capture the API request.";
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
  panel.append(handle, heading, status, actions);
  document.body.appendChild(panel);
  state.panel = panel;

  function makeDraggable() {
    let drag = null;
    handle.addEventListener("pointerdown", event => {
      const rect = panel.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      panel.style.left = rect.left + "px";
      panel.style.top = rect.top + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      handle.style.cursor = "grabbing";
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    });
    handle.addEventListener("pointermove", event => {
      if (!drag || drag.id !== event.pointerId) return;
      const left = Math.max(0, Math.min(innerWidth - panel.offsetWidth, drag.left + event.clientX - drag.x));
      const top = Math.max(0, Math.min(innerHeight - panel.offsetHeight, drag.top + event.clientY - drag.y));
      panel.style.left = left + "px";
      panel.style.top = top + "px";
    });
    const stop = event => {
      if (drag?.id === event.pointerId) {
        drag = null;
        handle.style.cursor = "grab";
      }
    };
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }
  makeDraggable();

  function safeScalar(key, value) {
    if (value == null || typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value !== "string") return undefined;
    const k = String(key).toLowerCase();
    if (/rank|all.?india|air|institute|college|course|speciality|specialty|quota|category|round|phase|counselling|counseling|seat|status|code|id$/.test(k)) {
      return value.length > 160 ? value.slice(0, 160) : value;
    }
    return "[string omitted; length " + value.length + "]";
  }

  function shape(value, depth = 0, key = "") {
    if (value === null) return null;
    if (Array.isArray(value)) {
      return {
        type: "array",
        length: value.length,
        sample: value.length ? shape(value[0], depth + 1, key + "[]") : null,
        second_sample: value.length > 1 ? shape(value[1], depth + 1, key + "[]") : undefined
      };
    }
    if (typeof value !== "object") return { type: typeof value, sample: safeScalar(key, value) };
    const keys = Object.keys(value);
    const result = { type: "object", keys };
    if (depth < 4) {
      result.fields = {};
      for (const childKey of keys.slice(0, 60)) {
        const child = value[childKey];
        if (child === null || typeof child !== "object") {
          const sample = safeScalar(childKey, child);
          result.fields[childKey] = { type: child === null ? "null" : typeof child };
          if (sample !== undefined) result.fields[childKey].sample = sample;
        } else {
          result.fields[childKey] = shape(child, depth + 1, childKey);
        }
      }
    }
    return result;
  }

  function bodyShape(body) {
    if (body == null) return null;
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        return { encoding: "JSON string", structure: shape(parsed) };
      } catch (_) {
        return { encoding: "string", length: body.length, sample: "[body values omitted]" };
      }
    }
    if (body instanceof URLSearchParams) return { encoding: "URLSearchParams", keys: [...new Set([...body.keys()])] };
    if (body instanceof FormData) return { encoding: "FormData", keys: [...new Set([...body.keys()])] };
    if (typeof body === "object") return { encoding: body.constructor?.name || "object", structure: shape(body) };
    return { encoding: typeof body };
  }

  function tableInfo() {
    return [...document.querySelectorAll("table")].slice(0, 5).map((table, index) => ({
      table: index + 1,
      headers: [...table.querySelectorAll("thead th")].map(x => x.innerText.trim()).filter(Boolean),
      row_count: table.querySelectorAll("tbody tr").length,
      first_row_cell_count: table.querySelector("tbody tr")?.querySelectorAll("td").length || 0
    }));
  }

  function paginationInfo() {
    return [...document.querySelectorAll("a,button")].filter(el => {
      const s = (el.innerText || "") + " " + (el.getAttribute("aria-label") || "") + " " + (el.title || "");
      return /next|prev|previous|page|>|»|›/i.test(s);
    }).slice(0, 30).map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || "").trim().slice(0, 60),
      aria_label: el.getAttribute("aria-label"),
      disabled: el.disabled === true || el.getAttribute("aria-disabled") === "true",
      href: el.getAttribute("href")
    }));
  }

  function safeUrl(raw) {
    const url = new URL(raw, location.href);
    for (const key of [...url.searchParams.keys()]) {
      if (/token|auth|session|password|secret|mobile|phone|email|otp/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return url.href;
  }

  function addEntry(entry) {
    if (state.entries.length >= 12) return;
    state.entries.push(entry);
    const report = {
      page: { url: location.href, title: document.title, host: location.host },
      captured_requests: state.entries,
      visible_tables: tableInfo(),
      pagination_controls: paginationInfo()
    };
    state.copyText = JSON.stringify(report, null, 2);
    copy.disabled = false;
    copy.style.opacity = "1";
    status.textContent = "Captured " + state.entries.length + " request(s). Trigger another page if needed, then Copy inspection.";
  }

  const xhrProto = XMLHttpRequest.prototype;
  const originalOpen = xhrProto.open;
  const originalSend = xhrProto.send;
  const originalFetch = window.fetch;
  const xhrMeta = new WeakMap();

  const wrappedOpen = function(method, url) {
    xhrMeta.set(this, { method: String(method || "GET").toUpperCase(), url: String(url), body: null });
    return originalOpen.apply(this, arguments);
  };
  const wrappedSend = function(body) {
    const meta = xhrMeta.get(this);
    if (meta) {
      meta.body = bodyShape(body);
      this.addEventListener("loadend", () => {
        try {
          const contentType = this.getResponseHeader("content-type") || "";
          let responseShape = null;
          if (/json/i.test(contentType) || this.responseType === "json") {
            let payload = this.responseType === "json" ? this.response : null;
            if (!payload && typeof this.responseText === "string") {
              try { payload = JSON.parse(this.responseText); } catch (_) {}
            }
            if (payload && typeof payload === "object") responseShape = shape(payload);
          }
          addEntry({
            transport: "XHR",
            method: meta.method,
            url: safeUrl(meta.url),
            status: this.status,
            content_type: contentType,
            request_body: meta.body,
            response: responseShape || (contentType ? { type: "non-JSON or unreadable" } : null)
          });
        } catch (error) {
          status.textContent = "XHR inspection error: " + (error?.message || String(error));
        }
      }, { once: true });
    }
    return originalSend.apply(this, arguments);
  };

  const wrappedFetch = function(input, init = {}) {
    const requestUrl = typeof input === "string" ? input : input?.url || String(input);
    const method = String(init.method || input?.method || "GET").toUpperCase();
    const requestBody = bodyShape(init.body);
    return originalFetch.apply(this, arguments).then(response => {
      try {
        const clone = response.clone();
        const contentType = clone.headers.get("content-type") || "";
        if (/json/i.test(contentType)) {
          clone.json().then(payload => addEntry({
            transport: "fetch",
            method,
            url: safeUrl(requestUrl),
            status: response.status,
            content_type: contentType,
            request_body: requestBody,
            response: shape(payload)
          })).catch(() => {});
        } else {
          addEntry({
            transport: "fetch",
            method,
            url: new URL(requestUrl, location.href).href,
            status: response.status,
            content_type: contentType,
            request_body: requestBody,
            response: { type: "non-JSON" }
          });
        }
      } catch (_) {}
      return response;
    });
  };

  xhrProto.open = wrappedOpen;
  xhrProto.send = wrappedSend;
  window.fetch = wrappedFetch;

  function restore() {
    if (xhrProto.open === wrappedOpen) xhrProto.open = originalOpen;
    if (xhrProto.send === wrappedSend) xhrProto.send = originalSend;
    if (window.fetch === wrappedFetch) window.fetch = originalFetch;
    state.installed = false;
  }

  async function copyReport() {
    if (!state.copyText) return;
    try {
      await navigator.clipboard.writeText(state.copyText);
      status.textContent = "Inspection copied. Paste it into this chat.";
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = state.copyText;
      area.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;";
      panel.appendChild(area);
      area.focus();
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) {}
      area.remove();
      status.textContent = ok ? "Inspection copied. Paste it into this chat." : "Copy failed. Try again in Chrome.";
    }
  }

  copy.addEventListener("click", copyReport);
  close.addEventListener("click", () => {
    restore();
    panel.remove();
  });

  console.info("[Zxtract] AP MQ diagnostics v1.0.0 installed.");
})();
