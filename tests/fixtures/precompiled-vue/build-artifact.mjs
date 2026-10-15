import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrecompiledVueArtifact } from "@vooya/vite/build";

const artifactRoot = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("./artifact", import.meta.url));
const source = resolve(artifactRoot, "component/PortableCounter.rs");
buildPrecompiledVueArtifact({ packageRoot: artifactRoot, source });
