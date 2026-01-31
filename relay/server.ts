const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com";
const PORT = Number(process.env.PORT) || 3100;
const RELAY_SECRET = process.env.RELAY_SECRET;
const TIMEOUT_MS = 120_000;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response("ok");
    }

    if (RELAY_SECRET && req.headers.get("x-relay-token") !== RELAY_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }

    const targetUrl = `${GOOGLE_API_BASE}${url.pathname}${url.search}`;

    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("x-relay-token");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
        signal: controller.signal,
        // @ts-expect-error - Bun supports duplex streaming
        duplex: "half",
      });

      clearTimeout(timeout);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const status = message.includes("aborted") ? 504 : 502;
      console.error(`[relay] ${req.method} ${url.pathname} -> ${status}: ${message}`);
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});

console.log(`Gemini relay listening on port ${server.port}`);
