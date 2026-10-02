import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readReleaseModel } from "./release-model.js";
import { readReleaseChannel, validateReleaseVersion } from "./release-channel.js";

const args = process.argv.slice(2);
const flags = new Set<string>();
const values = new Map<string, string>();
for (let i = 0; i < args.length; i++) {
  if (["--root", "--capture-latest", "--latest-before"].includes(args[i])) {
    if (!args[i + 1] || args[i + 1].startsWith("--") || values.has(args[i])) throw new Error(`Missing or duplicate value for ${args[i]}.`);
    values.set(args[i], args[++i]);
  } else if (["--dry-run", "--check", "--check-published", "--check-baseline"].includes(args[i]) && !flags.has(args[i])) flags.add(args[i]);
  else throw new Error(`Unknown or duplicate option ${args[i]}.`);
}
if (flags.size + Number(values.has("--capture-latest")) > 1) throw new Error("Choose only one release verification mode.");
if (values.has("--latest-before") && !flags.has("--check") && !flags.has("--check-baseline")) throw new Error("--latest-before requires --check or --check-baseline.");
const root = values.has("--root") ? resolve(values.get("--root")) : fileURLToPath(new URL("../..", import.meta.url));
if (flags.has("--check-baseline") && !values.has("--latest-before")) throw new Error("--check-baseline requires --latest-before.");
const channel = readReleaseChannel(root);
const { packages, byName } = readReleaseModel(root);
for (const { manifest } of packages) {
  if (!flags.has("--check-published") && !validateReleaseVersion(manifest.version, channel)) throw new Error(`Refusing to tag version ${manifest.name}@${manifest.version} as ${channel}.`);
}
if (flags.has("--dry-run")) {
  for (const { manifest } of packages) console.log(`Would verify ${manifest.name}@${manifest.version}, then set ${channel} -> ${manifest.version}`);
} else {
  // Read every package before mutating any tag. Preflight permits new packages;
  // exact post-publish verification never treats an absent version as success.
  const metadata = new Map<string, any>();
  for (const { manifest } of packages) metadata.set(manifest.name, await readMetadata(manifest.name));
  if (values.has("--capture-latest")) {
    // A missing baseline after a partial publication cannot be reconstructed:
    // latest may already have moved. Only a wholly unpublished candidate set
    // can establish a fresh baseline, including in a new workflow run.
    const candidates = JSON.parse(readFileSync(resolve(root, ".changeset/release.json"), "utf8")).packages;
    if (!Array.isArray(candidates) || !candidates.length || new Set(candidates.map((entry: any) => entry.name)).size !== candidates.length) throw new Error("Missing or duplicate release candidates for latest capture.");
    for (const entry of candidates) {
      if (byName.get(entry.name)?.manifest.version !== entry.version) throw new Error(`Invalid latest capture candidate ${entry.name}@${entry.version}.`);
      if (metadata.get(entry.name)?.versions?.[entry.version]) throw new Error(`Cannot capture a new latest baseline: ${entry.name}@${entry.version} is already published. Restore the original latest-before.json artifact for this release SHA.`);
    }
    const latest = Object.fromEntries(packages.map(({ manifest }) => [manifest.name, metadata.get(manifest.name)?.["dist-tags"]?.latest ?? null]));
    const alpha = channel === "beta" ? Object.fromEntries(packages.map(({ manifest }) => [manifest.name, metadata.get(manifest.name)?.["dist-tags"]?.alpha ?? null])) : undefined;
    writeFileSync(resolve(values.get("--capture-latest")), `${JSON.stringify({ channel, latest, ...(alpha ? { alpha } : {}) }, null, 2)}\n`, { flag: "wx" });
    console.log("Captured npm latest tags before publication.");
  } else if (flags.has("--check-baseline")) {
    verifyBaseline(metadata);
    console.log("Verified protected tag baseline before publication.");
  } else if (flags.has("--check-published")) {
    for (const { manifest } of packages) {
      const published = metadata.get(manifest.name);
      const tag = published?.["dist-tags"]?.[channel];
      if (((channel === "alpha" && published) || tag !== undefined) && (!validateReleaseVersion(tag, channel) || !published?.versions?.[tag])) throw new Error(`Invalid published ${channel} tag for ${manifest.name}.`);
    }
    console.log(`Preflight checked existing ${channel} metadata; this does not verify a new publication.`);
  } else {
    for (const { manifest } of packages) {
      const published = metadata.get(manifest.name);
      const exact = published?.versions?.[manifest.version];
      if (!exact || exact.name !== manifest.name || exact.version !== manifest.version) throw new Error(`npm registry is missing exact ${manifest.name}@${manifest.version}.`);
      for (const field of ["dependencies", "optionalDependencies"]) {
        const names = new Set([...Object.keys(manifest[field] ?? {}), ...Object.keys(exact[field] ?? {})]);
        for (const name of names) {
          if (byName.has(name) && exact[field]?.[name] !== manifest[field]?.[name]) throw new Error(`Published ${manifest.name} has incorrect ${field}.${name}.`);
        }
      }
      if (flags.has("--check") && published["dist-tags"]?.[channel] !== manifest.version) throw new Error(`npm ${channel} dist-tag for ${manifest.name} must be ${manifest.version}, found ${published["dist-tags"]?.[channel]}.`);
    }
    if (values.has("--latest-before")) verifyBaseline(metadata);
    if (!flags.has("--check")) {
      for (const { manifest } of packages) {
        const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["dist-tag", "add", `${manifest.name}@${manifest.version}`, channel], { cwd: root, stdio: "inherit" });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`npm dist-tag add failed for ${manifest.name}; retry after fixing the cause.`);
      }
    }
    console.log(flags.has("--check") ? `Verified exact published versions, internal dependencies, and ${channel} tags.` : `Synchronized ${channel} tags; run --check for final verification.`);
  }
}

async function readMetadata(name: string) {
  const registry = process.env.NPM_CONFIG_REGISTRY ?? process.env.npm_config_registry ?? "https://registry.npmjs.org/";
  const url = new URL(encodeURIComponent(name), registry.endsWith("/") ? registry : `${registry}/`);
  url.searchParams.set("vooya_check", `${Date.now()}-${Math.random()}`);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { accept: "application/vnd.npm.install-v1+json", "cache-control": "no-cache, no-store", pragma: "no-cache" },
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`npm registry request for ${name} failed with HTTP ${response.status}.`);
  return response.json();
}

function verifyBaseline(metadata: Map<string, any>) {
  const before = JSON.parse(readFileSync(resolve(values.get("--latest-before")), "utf8"));
  if (before.channel !== channel && !(channel === "alpha" && before.channel === undefined)) throw new Error("Protected tag snapshot channel does not match this release.");
  for (const tag of channel === "beta" ? ["latest", "alpha"] : ["latest"]) {
    for (const { manifest } of packages) {
      if (!Object.hasOwn(before[tag] ?? {}, manifest.name)) throw new Error(`Protected ${tag} snapshot is missing ${manifest.name}.`);
      if (before[tag][manifest.name] !== (metadata.get(manifest.name)?.["dist-tags"]?.[tag] ?? null)) throw new Error(`npm ${tag} changed during ${channel} publication for ${manifest.name}. Restore the recorded tag before completing the release.`);
    }
  }
}
