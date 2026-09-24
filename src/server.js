import { createServer } from "node:http";
import { readFile, unlink, stat } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { WebSocketServer } from "ws";
import { AUDIO_CACHE_DIR } from "./tts.js";
import { saveConfig, sanitizeConfigUpdate, defaultConfig } from "./config.js";

const AUDIO_FILENAME_RE = /^[0-9a-f-]+\.mp3$/i;

const PUBLIC_DIR = resolve(import.meta.dirname, "..", "public");

const MIME_TYPES = {
  ".html": "text/html",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
};

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}");
}

export function startServer(port, config, manager) {
  const server = createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://localhost");

      if (pathname === "/" || pathname === "/index.html") {
        const [html, logoStat] = await Promise.all([
          readFile(resolve(PUBLIC_DIR, "index.html"), "utf-8"),
          stat(resolve(PUBLIC_DIR, "logo.png")),
        ]);
        // Browsers (and the Windows taskbar icon that follows Edge's app-mode
        // window) cache favicons very aggressively by URL alone, ignoring
        // normal cache headers. Appending the file's mtime busts that cache
        // whenever logo.png is replaced, without needing a manual version bump.
        const versioned = html.replace(
          'href="/logo.png"',
          `href="/logo.png?v=${logoStat.mtimeMs}"`,
        );
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(versioned);
        return;
      }

      if (pathname === "/logo.png") {
        const body = await readFile(resolve(PUBLIC_DIR, "logo.png"));
        res.writeHead(200, { "Content-Type": MIME_TYPES[".png"] });
        res.end(body);
        return;
      }

      if (pathname === "/api/config" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(config));
        return;
      }

      if (pathname === "/api/config" && req.method === "POST") {
        let updates;
        try {
          updates = await readJsonBody(req);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }
        const next = sanitizeConfigUpdate(config, updates);
        Object.assign(config, next);
        saveConfig(config);
        broadcast({ type: "config", config });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(config));
        return;
      }

      if (pathname === "/api/reset" && req.method === "POST") {
        manager.disconnect();
        Object.assign(config, defaultConfig());
        saveConfig(config);
        broadcast({ type: "config", config });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(config));
        return;
      }

      if (pathname === "/api/status" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(manager.getStatus()));
        return;
      }

      if (pathname === "/api/connect" && req.method === "POST") {
        let body;
        try {
          body = await readJsonBody(req);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }
        const username = String(body.username || "").trim().replace(/^@/, "");
        if (!username) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "username is required" }));
          return;
        }
        config.tiktokUsername = username;
        saveConfig(config);
        manager.connect(username);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(manager.getStatus()));
        return;
      }

      if (pathname === "/api/disconnect" && req.method === "POST") {
        manager.disconnect();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(manager.getStatus()));
        return;
      }

      if (pathname.startsWith("/audio/")) {
        const filename = basename(pathname.replace("/audio/", ""));
        if (!AUDIO_FILENAME_RE.test(filename)) {
          res.writeHead(400);
          res.end("Bad request");
          return;
        }
        const filepath = resolve(AUDIO_CACHE_DIR, filename);
        const body = await readFile(filepath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[".mp3"] });
        res.end(body);
        // Each file is generated for one playback; delete once served so
        // the cache doesn't grow unbounded over a long stream.
        unlink(filepath).catch(() => {});
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  const wss = new WebSocketServer({ server, path: "/ws" });

  function broadcast(payload) {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  }

  function broadcastComment({ user, message, url = null }) {
    broadcast({ type: "comment", user, message, url });
  }

  manager.on("status", (status) => broadcast({ type: "status", ...status }));
  manager.on("roomChanged", () => broadcast({ type: "clear" }));

  server.listen(port);

  return { server, broadcastComment };
}
