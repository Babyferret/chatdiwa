import { createServer } from "node:http";
import { readFile, unlink } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { WebSocketServer } from "ws";
import { AUDIO_CACHE_DIR } from "./tts.js";
import { saveConfig, sanitizeConfigUpdate } from "./config.js";

const AUDIO_FILENAME_RE = /^[0-9a-f-]+\.mp3$/i;

const PUBLIC_DIR = resolve(import.meta.dirname, "..", "public");

const MIME_TYPES = {
  ".html": "text/html",
  ".mp3": "audio/mpeg",
};

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}");
}

export function startServer(port, config) {
  const server = createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://localhost");

      if (pathname === "/" || pathname === "/index.html") {
        const body = await readFile(resolve(PUBLIC_DIR, "index.html"));
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
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
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(config));
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

  function broadcastSpeech(filename, { user, message }) {
    const payload = JSON.stringify({
      type: "speak",
      url: `/audio/${filename}`,
      user,
      message,
    });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }

  server.listen(port);

  return { server, broadcastSpeech };
}
