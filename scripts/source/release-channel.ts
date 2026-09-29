import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ReleaseChannel = "alpha" | "beta";

export function readReleaseChannel(root: string): ReleaseChannel {
  const pre = JSON.parse(readFileSync(resolve(root, ".changeset/pre.json"), "utf8"));
  if (pre.mode !== "pre" || (pre.tag !== "alpha" && pre.tag !== "beta")) throw new Error("Publication requires Changesets prerelease mode with an alpha or beta channel; stable publication is not enabled.");
  return pre.tag;
}

export function validateReleaseVersion(version: unknown, channel: ReleaseChannel): version is string {
  if (typeof version !== "string") return false;
  if (channel === "beta") return /^0\.1\.0-beta\.(0|[1-9]\d*)$/.test(version);
  if (channel === "alpha") return /^0\.(0|[1-9]\d*)\.(0|[1-9]\d*)-alpha\.(0|[1-9]\d*)$/.test(version);
  return false;
}
