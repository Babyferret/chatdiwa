import { spawn } from "node:child_process";

const BROWSER_COMMANDS = {
  win32: (url) => ["cmd", ["/c", "start", "", "msedge", `--app=${url}`]],
  darwin: (url) => [
    "open",
    ["-na", "Microsoft Edge", "--args", `--app=${url}`],
  ],
  linux: (url) => ["microsoft-edge", [`--app=${url}`]],
};

// Best-effort: opens the control panel as a chrome-less "app window" instead
// of a normal browser tab. Never throws — if no supported browser is found,
// the caller falls back to just printing the URL.
export function openControlPanelWindow(url) {
  const build = BROWSER_COMMANDS[process.platform];
  if (!build) return false;

  try {
    const [command, args] = build(url);
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
