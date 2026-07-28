// Polls /api/health until the server answers, then opens the default browser.
// start.bat runs this detached so the API keeps the console window.
const { spawn } = require("child_process");
const config = require("../config");

const url = `http://localhost:${config.port}`;
const timeoutMs = 30000;
const started = Date.now();

function openBrowser() {
  if (process.platform === "win32") {
    // `start` is a cmd builtin; the empty "" is the window title argument.
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else {
    const opener = process.platform === "darwin" ? "open" : "xdg-open";
    spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
  }
}

async function poll() {
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        openBrowser();
        return;
      }
    } catch {
      // Server not listening yet.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.error(`Server did not answer at ${url} within ${timeoutMs / 1000}s - open it manually.`);
  process.exitCode = 1;
}

poll();
