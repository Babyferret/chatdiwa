import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { get } from "node:https";
import { resolve } from "node:path";

const CLOUDFLARED_DOWNLOAD_URL =
  "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";

const BIN_DIR = resolve(process.cwd(), ".chatdiwa-bin");
const CLOUDFLARED_PATH = resolve(BIN_DIR, "cloudflared.exe");

const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

// cloudflared prints its assigned URL inside a bordered log line like:
// "... INF |  https://word-word-word-word.trycloudflare.com  |"
export function parseTunnelUrl(line) {
  const match = line.match(TUNNEL_URL_RE);
  return match ? match[0] : null;
}

function followRedirects(url, res, onResponse, onError) {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    get(res.headers.location, (nextRes) =>
      followRedirects(res.headers.location, nextRes, onResponse, onError),
    ).on("error", onError);
    return;
  }
  onResponse(res);
}

export function downloadCloudflared(destPath = CLOUDFLARED_PATH) {
  return new Promise((resolvePromise, reject) => {
    mkdirSync(BIN_DIR, { recursive: true });
    get(CLOUDFLARED_DOWNLOAD_URL, (res) => {
      followRedirects(
        CLOUDFLARED_DOWNLOAD_URL,
        res,
        (finalRes) => {
          if (finalRes.statusCode !== 200) {
            reject(new Error(`Download failed with status ${finalRes.statusCode}`));
            return;
          }
          const file = createWriteStream(destPath);
          finalRes.pipe(file);
          file.on("finish", () => file.close(() => resolvePromise(destPath)));
          file.on("error", reject);
        },
        reject,
      );
    }).on("error", reject);
  });
}

export async function ensureCloudflaredBinary() {
  if (existsSync(CLOUDFLARED_PATH)) {
    return CLOUDFLARED_PATH;
  }
  return downloadCloudflared(CLOUDFLARED_PATH);
}

// Manages a single Cloudflare Quick Tunnel process for exposing the local
// server publicly - needed because TikTok LIVE Studio's Link source (unlike
// OBS's Browser Source) doesn't accept localhost URLs at all.
export function createTunnelManager() {
  const emitter = new EventEmitter();
  let child = null;
  let status = "idle";
  let url = null;

  function setStatus(next, extra = {}) {
    status = next;
    emitter.emit("status", { status, url, ...extra });
  }

  return {
    async start(port) {
      if (child) return;
      try {
        setStatus("downloading");
        const binPath = await ensureCloudflaredBinary();
        setStatus("connecting");

        child = spawn(binPath, ["tunnel", "--url", `http://localhost:${port}`]);

        const handleOutput = (data) => {
          if (url) return;
          for (const line of data.toString().split("\n")) {
            const found = parseTunnelUrl(line);
            if (found) {
              url = found;
              setStatus("ready");
              break;
            }
          }
        };
        child.stdout.on("data", handleOutput);
        child.stderr.on("data", handleOutput);

        child.on("exit", () => {
          child = null;
          url = null;
          setStatus("idle");
        });
        child.on("error", (err) => {
          setStatus("error", { error: err.message });
        });
      } catch (err) {
        setStatus("error", { error: err.message });
      }
    },

    stop() {
      if (child) {
        child.kill();
        child = null;
      }
      url = null;
      setStatus("idle");
    },

    getStatus() {
      return { status, url };
    },

    on: (event, listener) => emitter.on(event, listener),
  };
}
