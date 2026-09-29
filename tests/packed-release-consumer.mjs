import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = mkdtempSync(resolve(tmpdir(), "vooya-candidate-packs-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
try {
  const channels = new Set();
  for (const name of readdirSync(resolve(root, "packages"))) {
    const manifestPath = resolve(root, "packages", name, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.private) continue;
    const channel = /^0\.\d+\.\d+-(alpha|beta)\.\d+$/.exec(manifest.version)?.[1];
    if (!channel) throw new Error(`Unsupported candidate version ${manifest.name}@${manifest.version}.`);
    channels.add(channel);
    run(npm, ["pack", "--workspace", manifest.name, "--pack-destination", directory, "--ignore-scripts", "--json"]);
  }
  if (channels.size !== 1) throw new Error("Packed release consumers require one coherent alpha or beta channel.");
  run(process.execPath, [resolve(root, "tests/registry-consumer.mjs"), "--pack-dir", directory, "--expected-root", root, "--tag", [...channels][0]]);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" && command.endsWith(".cmd") });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Candidate package acceptance failed: ${command} ${args.join(" ")}`);
}
