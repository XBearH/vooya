import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPackages } from "@manypkg/get-packages";
import { readConfig } from "@changesets/config";
import { readChangesets } from "@changesets/read";
import { assembleReleasePlan } from "@changesets/assemble-release-plan";
import { readReleaseModel } from "./release-model.js";

// Share the exact first-beta policy between the read-only preview and version
// application. Changesets continues to own planning and applying every release.
export async function readReviewedReleasePlan(root: string) {
  const before = readReleaseModel(root).packages.map(({ manifest }) => ({ name: manifest.name, version: manifest.version }));
  const prePath = resolve(root, ".changeset/pre.json");
  const pre = existsSync(prePath) ? JSON.parse(readFileSync(prePath, "utf8")) : undefined;
  const workspace = await getPackages(root);
  const result = await readConfig(root, workspace);
  if (result.errors) throw new Error(result.errors.join("\n"));
  const plan = assembleReleasePlan(await readChangesets(root), workspace, result.config, pre);
  const firstBeta = pre?.mode === "pre" && pre.tag === "beta" && before.some(({ version }) => /^0\.1\.0-alpha\.\d+$/.test(version));
  if (firstBeta) {
    if (!before.every(({ version }) => /^0\.1\.0-alpha\.\d+$/.test(version))) throw new Error("The first beta transition requires the entire public package set to be on 0.1.0-alpha.N.");
    const expected = new Set(before.map(({ name }) => name));
    if (plan.releases.length !== expected.size || plan.releases.some((release) => !expected.delete(release.name) || !/^0\.1\.0-beta\.\d+$/.test(release.newVersion)) || expected.size) {
      throw new Error("The first beta plan must include every public package at base version 0.1.0. Add a changeset for the missing packages; do not edit package versions by hand.");
    }
    // Changesets 3 carries alpha's numeric counter into a different pre tag.
    // Normalize this one transition; the official applier still owns dependency
    // pins, changelogs, package versions and prerelease changeset archives.
    for (const release of plan.releases) release.newVersion = "0.1.0-beta.0";
  }
  return { plan, workspace, config: result.config, firstBeta };
}
