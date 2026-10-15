import { spawn } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fixture = resolve(repositoryRoot, "tests/fixtures/portable-vue");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "vooya-hmr-"));
const project = resolve(temporaryRoot, "app");
const port = await availablePort();
const vite = resolve(repositoryRoot, "node_modules/vite/bin/vite.js");
let output = "";
let browser;
let server;

try {
  cpSync(fixture, project, { recursive: true });
  symlinkSync(resolve(repositoryRoot, "node_modules"), resolve(project, "node_modules"), "dir");

  server = spawn(
    process.execPath,
    [vite, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: project, env: { ...process.env, FORCE_COLOR: "0" } },
  );
  server.stdout.on("data", collectOutput);
  server.stderr.on("data", collectOutput);

  await waitForServer(`http://127.0.0.1:${port}`);
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}`);
  await expectText(page, "6");

  const dependencyPath = resolve(project, "rust/portable-math/src/lib.rs");
  const dependency = readFileSync(dependencyPath, "utf8");
  writeFileSync(dependencyPath, dependency.replace("value * 2", "value * 3"));
  await expectText(page, "9");

  const componentPath = resolve(project, "src/PortableCounter.rs");
  const source = readFileSync(componentPath, "utf8");
  const invalid = source.replace(
    ".text(&display_value(context.props.initial).to_string())",
    ".text(&missing_value.to_string())",
  );
  writeFileSync(componentPath, invalid);
  await waitFor(() => output.includes("Cargo build failed with exit code"));
  if (server.exitCode !== null) throw new Error("Vite exited after a failed Rust rebuild.");

  const recovered = source.replace(
    ".text(&display_value(context.props.initial).to_string())",
    ".text(&(display_value(context.props.initial) + 4).to_string())",
  );
  writeFileSync(componentPath, recovered);
  await expectText(page, "13");

  const failuresBeforeRapidSave = occurrences(output, "Cargo build failed with exit code");
  writeFileSync(componentPath, invalid);
  writeFileSync(
    componentPath,
    source.replace(
      ".text(&display_value(context.props.initial).to_string())",
      ".text(&(display_value(context.props.initial) + 5).to_string())",
    ),
  );
  await expectText(page, "14");
  const failuresAfterRapidSave = occurrences(output, "Cargo build failed with exit code");
  if (failuresAfterRapidSave !== failuresBeforeRapidSave) {
    throw new Error("A superseded rapid save was compiled instead of being coalesced.");
  }

  console.log("Vooya dev rebuild recovered from errors and coalesced rapid saves.");
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolveClose) => server.once("close", resolveClose));
  }
  rmSync(temporaryRoot, { force: true, recursive: true });
}

function collectOutput(chunk) {
  output += chunk.toString();
}

async function expectText(page, expected) {
  await page.locator(".portable-counter").getByText(expected, { exact: true }).waitFor({
    timeout: 20_000,
  });
}

async function waitForServer(url) {
  await waitFor(async () => {
    try {
      return (await fetch(url)).ok;
    } catch {
      return false;
    }
  }, 30_000);
}

async function waitFor(predicate, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`Timed out waiting for Vooya dev server.\n${output}`);
}

function occurrences(source, value) {
  return source.split(value).length - 1;
}

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => resolvePort(address.port));
    });
  });
}
