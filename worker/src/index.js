const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function withHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("access-control-allow-origin", "*");
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/health") {
      return json({ name: "Zxtract", status: "ok" });
    }

    if (url.pathname === "/api/scripts") {
      const response = await env.ASSETS.fetch(new Request(new URL("/scripts-manifest.json", url.origin)));
      if (!response.ok) return json({ error: "Script catalogue is unavailable" }, 503);
      return withHeaders(response, { "content-type": "application/json; charset=utf-8" });
    }

    if (url.pathname === "/launcher.js") {
      const response = await env.ASSETS.fetch(new Request(new URL("/launcher.js", url.origin)));
      if (!response.ok) return json({ error: "Launcher asset is unavailable" }, 404);
      return withHeaders(response, { "content-type": "application/javascript; charset=utf-8" });
    }

    if (url.pathname.startsWith("/scripts/")) {
      let relativePath;
      try {
        relativePath = url.pathname.slice("/scripts/".length)
          .split("/")
          .map(segment => decodeURIComponent(segment))
          .join("/");
      } catch {
        return json({ error: "Invalid script path" }, 400);
      }

      if (
        !relativePath ||
        relativePath.startsWith("/") ||
        relativePath.split("/").some(segment => !segment || segment === "." || segment === "..") ||
        relativePath.includes("\\") ||
        !relativePath.endsWith(".js")
      ) {
        return json({ error: "Invalid script path" }, 400);
      }

      const manifestResponse = await env.ASSETS.fetch(
        new Request(new URL("/scripts-manifest.json", url.origin))
      );
      if (!manifestResponse.ok) return json({ error: "Script catalogue is unavailable" }, 503);
      const catalogue = await manifestResponse.json();
      if (!catalogue.scripts?.some(item => item.path === relativePath)) {
        return json({ error: "Script not found" }, 404);
      }

      const assetUrl = new URL("/" + relativePath.split("/").map(encodeURIComponent).join("/"), url.origin);
      const response = await env.ASSETS.fetch(new Request(assetUrl));
      if (!response.ok) return json({ error: "Script asset is unavailable" }, 404);
      return withHeaders(response, {
        "content-type": "application/javascript; charset=utf-8",
        "content-disposition": "inline"
      });
    }

    if (url.pathname === "/") {
      return new Response(
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Zxtract Worker</title><body style=\"font:16px system-ui;max-width:680px;margin:48px auto;padding:0 18px\"><h1>Zxtract Worker</h1><p>Worker is running.</p><p><a href=\"/api/scripts\">View available script catalogue</a></p><p>Use the Zxtract bookmarklet on a supported counselling page to open the launcher.</p></body></html>",
        { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
      );
    }

    return json({ error: "Not found" }, 404);
  }
};
