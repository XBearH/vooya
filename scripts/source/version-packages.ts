import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readReleaseModel } from "./release-model.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const before = readReleaseModel(root).packages.map(({ manifest }) => ({ name: manifest.name, version: manifest.version }));
const prePath = resolve(root, ".changeset/pre.json");
const pre = existsSync(prePath) ? JSON.parse(readFileSync(prePath, "utf8")) : undefined;
const firstBeta = pre?.mode === "pre" && pre.tag === "beta" && before.some(({ version }) => /^0\.1\.0-alpha\.\d+$/.test(version));
if (firstBeta) {
  if (!before.every(({ version }) => /^0\.1\.0-alpha\.\d+$/.test(version))) throw new Error("The first beta transition requires the entire public package set to be on 0.1.0-alpha.N.");
  await versionFirstBeta();
} else {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.resolve("@changesets/cli/bin.js")), "version"], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const packages = readReleaseModel(root).packages.filter(({ manifest }) => before.find((entry) => entry.name === manifest.name)?.version !== manifest.version).map(({ manifest }) => ({ name: manifest.name, version: manifest.version }));
if (packages.length) writeFileSync(resolve(root, ".changeset/release.json"), `${JSON.stringify({ packages }, null, 2)}\n`);

async function versionFirstBeta() {
  const { getPackages } = await import("@manypkg/get-packages");
  const { readConfig } = await import("@changesets/config");
  const { readChangesets } = await import("@changesets/read");
  const { assembleReleasePlan } = await import("@changesets/assemble-release-plan");
  const { applyReleasePlan } = await import("@changesets/apply-release-plan");
  const workspace = await getPackages(root);
  const result = await readConfig(root, workspace);
  if (result.errors) throw new Error(result.errors.join("\n"));
  const plan = assembleReleasePlan(await readChangesets(root), workspace, result.config, pre);
  const expected = new Set(before.map(({ name }) => name));
  if (plan.releases.length !== expected.size || plan.releases.some((release) => !expected.delete(release.name) || !/^0\.1\.0-beta\.\d+$/.test(release.newVersion)) || expected.size) {
    throw new Error("The first beta plan must include every public package at base version 0.1.0. Add a changeset for the missing packages; do not edit package versions by hand.");
  }
  // Changesets 3 carries alpha's numeric counter into a different pre tag.
  // Normalize this one channel transition in its plan; its official applier
  // still owns dependency pins, changelogs, package versions and pre archives.
  for (const release of plan.releases) release.newVersion = "0.1.0-beta.0";
  await applyReleasePlan(plan, workspace, result.config, undefined, root);
  console.log(`Prepared ${plan.releases.length} packages for the first 0.1.0-beta.0 release.`);
}
