import { fileURLToPath } from "node:url";
import { readReviewedReleasePlan } from "./release-plan.js";

if (process.argv.length !== 2) throw new Error("release-status takes no arguments and never writes files.");
const root = fileURLToPath(new URL("../..", import.meta.url));
const { plan } = await readReviewedReleasePlan(root);
console.log(plan.releases.length ? "Planned versions (no files changed):" : "No pending package releases.");
for (const release of plan.releases) console.log(`${release.name}: ${release.oldVersion} -> ${release.newVersion}`);
