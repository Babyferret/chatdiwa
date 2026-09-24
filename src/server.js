import { createServer } from "node:http";
import { readFile, unlink } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { WebSocketServer } from "ws";
import { AUDIO_CACHE_DIR } from "./tts.js";

const AUDIO_FILENAME_RE = /^[0-9a-f-]+\.mp3$/i;

const PUBLIC_DIR = resolve(import.meta.dirname, "..", "public");

const MIME_TYPES = {
  ".html": "text/html",
  ".mp3": "audio/mpeg",
};

export function startServer(port) {
  const server = createServer(async (req, res) => {
    try {
      if (req.url === "/" || req.url === "/index.html") {
        const body = await readFile(resolve(PUBLIC_DIR, "index.html"));
        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(body);
        return;
      }

      if (req.url.startsWith("/audio/")) {
        const filename = basename(req.url.replace("/audio/", ""));
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

  function broadcastSpeech(text, filename) {
    const payload = JSON.stringify({
      type: "speak",
      text,
      url: `/audio/${filename}`,
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
