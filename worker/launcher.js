(() => {
  "use strict";

  const PANEL_ID = "zxtract-launcher-panel";
  if (document.getElementById(PANEL_ID)) {
    document.getElementById(PANEL_ID).remove();
    return;
  }

  const scriptElement = document.currentScript;
  if (!scriptElement?.src) {
    alert("Zxtract launcher could not determine its Worker URL.");
    return;
  }
  const workerBase = new URL(".", scriptElement.src).origin;
  const panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position:fixed", "z-index:2147483647", "right:12px", "bottom:12px",
    "left:12px", "max-width:540px", "margin-left:auto", "padding:14px",
    "background:#111827", "color:#f9fafb", "border:1px solid #374151",
    "border-radius:12px", "box-shadow:0 5px 28px #0009",
    "font:14px/1.45 system-ui,sans-serif"
  ].join(";");

  const dragHandle = document.createElement("div");
  dragHandle.setAttribute("aria-label", "Drag to move Zxtract");
  dragHandle.style.cssText = "height:18px;display:flex;align-items:center;justify-content:center;margin:-5px 0 7px;";
  const grip = document.createElement("div");
  grip.style.cssText = "width:42px;height:4px;border-radius:4px;background:#64748b;";
  dragHandle.appendChild(grip);

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px";
  const title = document.createElement("strong");
  title.textContent = "Zxtract";
  title.style.cssText = "font-size:16px";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.style.cssText = buttonStyle("#374151");
  close.addEventListener("click", () => panel.remove());
  header.append(title, close);

  const description = document.createElement("div");
  description.textContent = "Choose an extractor from the repository.";
  description.style.cssText = "color:#cbd5e1;margin-bottom:9px";

  const select = document.createElement("select");
  select.style.cssText = "box-sizing:border-box;width:100%;padding:10px;border:1px solid #4b5563;border-radius:7px;background:#1f2937;color:#f9fafb;font:14px system-ui;margin-bottom:10px";
  const load = document.createElement("button");
  load.type = "button";
  load.textContent = "Load selected extractor";
  load.style.cssText = buttonStyle("#2563eb");
  const status = document.createElement("div");
  status.textContent = "Loading script catalogue…";
  status.style.cssText = "color:#bfdbfe;margin-top:9px;font-size:12px;overflow-wrap:anywhere";
  panel.append(dragHandle, header, description, select, load, status);
  document.body.appendChild(panel);

function makeDraggable(panel, handle) {
    const storageKey = "zxtract-position-launcher-v1";
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

  function buttonStyle(background) {
    return "padding:9px 12px;border:0;border-radius:7px;background:" + background +
      ";color:white;font:600 13px system-ui;min-height:36px;cursor:pointer";
  }

  function setStatus(message, color) {
    status.textContent = message;
    status.style.color = color || "#bfdbfe";
  }

  load.disabled = true;
  load.addEventListener("click", () => {
    const selected = scripts.find(item => item.path === select.value);
    if (!selected) return;
    const existing = document.querySelector('script[data-zxtract-path="' + CSS.escape(selected.path) + '"]');
    if (existing) {
      setStatus("This extractor has already been loaded. Reload the page before loading it again.", "#fbbf24");
      return;
    }

    load.disabled = true;
    setStatus("Loading " + selected.title + "…");
    const script = document.createElement("script");
    script.src = workerBase + "/scripts/" +
      selected.path.split("/").map(encodeURIComponent).join("/");
    script.async = true;
    script.dataset.zxtractPath = selected.path;
    script.onload = () => {
      setStatus("Loaded " + selected.title + (selected.version ? " · " + selected.version : "") + ".");
      load.disabled = false;
    };
    script.onerror = () => {
      script.remove();
      setStatus("Could not load the script. The site may block external scripts through its Content Security Policy.", "#fca5a5");
      load.disabled = false;
    };
    document.head.appendChild(script);
  });

  let scripts = [];
  fetch(workerBase + "/api/scripts", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Catalogue request failed (HTTP " + response.status + ").");
      return response.json();
    })
    .then(catalogue => {
      scripts = Array.isArray(catalogue.scripts) ? catalogue.scripts : [];
      if (!scripts.length) {
        setStatus("No executable .js extractors found under allotments/.", "#fbbf24");
        return;
      }
      let currentGroup = null;
      let group;
      for (const item of scripts) {
        if (item.category !== currentGroup) {
          currentGroup = item.category;
          group = document.createElement("optgroup");
          group.label = currentGroup;
          select.appendChild(group);
        }
        const option = document.createElement("option");
        option.value = item.path;
        option.textContent = item.title + (item.version ? " · " + item.version : "");
        group.appendChild(option);
      }
      load.disabled = false;
      setStatus(scripts.length + " extractor(s) available · catalogue generated from the repository.");
    })
    .catch(error => {
      setStatus(error?.message || "Could not load the script catalogue.", "#fca5a5");
    });
})();
