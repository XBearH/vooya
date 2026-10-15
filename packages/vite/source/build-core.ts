import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileComponentStyle, VOO_ABI_VERSION } from "@vooya/compiler";
import {
  buildApplication as buildSharedApplication,
  buildRustComponentContracts,
  indexVooyaSchema,
  generateRustSchemaDeclaration,
  renderRustComponentModule,
  resolveRustSchemaGroup,
} from "@vooya/build-core";

export const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

export function buildCore(root = repositoryRoot) {
  return buildSharedApplication({
    applicationRoot: root,
    workspaceRoot: resolve(root, "target/vooya-package"),
    outputDir: resolve(root, "packages/core/dist"),
  });
}

export {
  buildApplication,
  generatedCargoManifest,
  remapRustDiagnostic,
  resolveRuntimeCrateRoot,
  resolveRustDependencyRoots,
} from "@vooya/build-core";

/** Build an explicitly named Rust component into a self-contained Vue artifact. */
export function buildPrecompiledVueArtifact({
  packageRoot,
  source,
  outputDir,
}: {
  packageRoot?: string;
  source?: string;
  outputDir?: string;
} = {}) {
  const root = resolveArtifactPackageRoot(packageRoot);
  const metadata = readArtifactPackageMetadata(root);
  const sourcePath = resolveArtifactSource(root, source);
  const distribution = resolveArtifactOutput(root, outputDir);
  if (metadata.dependencies?.["@vooya/vue"] !== metadata.version) {
    throw new Error(`${metadata.name} must depend on @vooya/vue at its exact package version.`);
  }
  rmSync(distribution, { recursive: true, force: true });
  mkdirSync(distribution, { recursive: true });
  const result = buildSharedApplication({
    applicationRoot: root,
    workspaceRoot: resolve(root, ".artifact-build"),
    outputDir: resolve(distribution, "wasm"),
    rust: {
      sourceRoot: relative(root, dirname(sourcePath)),
      webSysFeatures: ["Node", "NodeList"],
    },
    framework: "vue",
  });
  const index = indexVooyaSchema(result.schema);
  const contracts = buildRustComponentContracts(index).filter((contract) =>
    contract.component.group && resolveRustSchemaGroup(root, contract.component.group) === sourcePath,
  );
  if (contracts.length !== 1) {
    throw new Error(`Vooya Vue artifacts require exactly one Rust component in ${sourcePath}.`);
  }
  const contract = contracts[0];
  // Match snake_case_ident in vooya-macros, including consecutive capitals.
  const stem = contract.component.name
    .replace(/[A-Z]/g, (character, index) => `${index > 0 ? "_" : ""}${character.toLowerCase()}`)
    .replace(/[^a-z0-9_]/gu, "_") || "store";
  const manifest = {
    formatVersion: 1 as const,
    artifactVersion: metadata.version,
    framework: "vue" as const,
    component: contract.component.name,
    abiVersion: VOO_ABI_VERSION,
    bindings: {
      mount: `voo_${stem}_mount`,
      dispose: `voo_${stem}_dispose`,
      updates: { props: `voo_${stem}_update_props` },
    },
    wasm: "./wasm/vooya_app_bg.wasm",
    types: "./index.d.ts",
  };
  const styles = contract.component.styles ?? [];
  let styleModule: string | undefined;
  if (styles.length) {
    const content = styles
      .map((style) => readFileSync(resolve(dirname(sourcePath), style.path), "utf8"))
      .join("\n");
    writeFileSync(resolve(distribution, "component.css"), compileComponentStyle({
      id: sourcePath,
      name: contract.component.name,
      style: { content, scoped: styles.some((style) => style.scoped) },
    }));
    styleModule = "./component.css";
  }
  // Ship the same retryable initialization helper without a compiler or plugin dependency.
  const runtime = readFileSync(new URL("./runtime.js", import.meta.url), "utf8")
    .replace(/^export \{ VOO_ABI_VERSION \} from .*;\r?\n/m, "")
    .replace(/^import \{ VOO_ABI_VERSION \} from .*;\r?\n/m, `const VOO_ABI_VERSION = ${VOO_ABI_VERSION};\n`);
  writeFileSync(resolve(distribution, "runtime.js"), runtime);
  const entry = renderRustComponentModule(contract, "vue", sourcePath, {
    runtimeModule: "./wasm/vooya_app.js",
    runtimeHelpers: "./runtime.js",
    styleModule,
  });
  writeFileSync(resolve(distribution, "index.js"), entry + `
export const manifest = ${JSON.stringify(manifest, null, 2)};
export function assertArtifactAbi(actual) {
  if (actual !== manifest.abiVersion) throw new Error(\`Vooya artifact ABI mismatch for \${manifest.component}: artifact expects \${manifest.abiVersion}, but WASM provides \${String(actual)}.\`);
}
`);
  const declaration = generateRustSchemaDeclaration({ contract, framework: "vue", types: index.types });
  writeFileSync(resolve(distribution, "index.d.ts"), declaration + `
export interface VooyaArtifactManifest {
  formatVersion: 1;
  artifactVersion: string;
  framework: "vue";
  component: ${JSON.stringify(manifest.component)};
  abiVersion: number;
  bindings: {
    mount: string;
    dispose: string;
    updates: Record<string, string>;
  };
  wasm: string;
  types: string;
}
export const manifest: VooyaArtifactManifest;
export function assertArtifactAbi(actual: number): void;
`);
  writeFileSync(resolve(distribution, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  validatePrecompiledVueArtifactOutput(distribution);
  return manifest;
}

function resolveArtifactPackageRoot(packageRoot: unknown) {
  if (typeof packageRoot !== "string" || !packageRoot) {
    throw new Error("Vooya precompiled Vue artifacts require an explicit packageRoot directory.");
  }
  const root = resolve(packageRoot);
  try {
    if (!statSync(root).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error(`Vooya precompiled Vue artifact packageRoot must be an existing directory: ${root}.`);
  }
  return root;
}

function readArtifactPackageMetadata(packageRoot: string) {
  const packageJson = resolve(packageRoot, "package.json");
  if (!existsSync(packageJson)) {
    throw new Error(`Vooya precompiled Vue artifact packageRoot is missing package.json: ${packageRoot}.`);
  }
  const metadata: unknown = JSON.parse(readFileSync(packageJson, "utf8"));
  if (!metadata || typeof metadata !== "object") {
    throw new Error("Vooya precompiled Vue artifact package.json must declare a package name.");
  }
  if (!("name" in metadata) || typeof metadata.name !== "string" || !metadata.name.trim()) {
    throw new Error("Vooya precompiled Vue artifact package.json must declare a package name.");
  }
  if (!("version" in metadata) || typeof metadata.version !== "string" || !isSemverVersion(metadata.version)) {
    throw new Error(`${metadata.name} must declare a valid package version.`);
  }
  const dependencies = "dependencies" in metadata && metadata.dependencies && typeof metadata.dependencies === "object"
    ? metadata.dependencies as Record<string, unknown>
    : undefined;
  return { name: metadata.name, version: metadata.version, dependencies };
}

function resolveArtifactSource(packageRoot: string, source: unknown) {
  if (typeof source !== "string" || !source.endsWith(".rs")) {
    throw new Error("Vooya precompiled Vue artifacts require an explicit source .rs file.");
  }
  const sourcePath = resolve(source);
  if (!isPathInside(sourcePath, packageRoot)) {
    throw new Error("Vooya precompiled Vue artifact source must stay inside packageRoot.");
  }
  try {
    if (!statSync(sourcePath).isFile()) throw new Error("not a file");
  } catch {
    throw new Error(`Vooya precompiled Vue artifact source must be an existing file: ${sourcePath}.`);
  }
  return sourcePath;
}

function resolveArtifactOutput(packageRoot: string, outputDir?: string) {
  const expected = resolve(packageRoot, "dist");
  const output = resolve(outputDir ?? expected);
  if (output !== expected) {
    throw new Error(`Vooya precompiled Vue artifact output must be packageRoot/dist: ${expected}.`);
  }
  return output;
}

export function validatePrecompiledVueArtifactOutput(outputDir: string) {
  const expected = [
    "manifest.json",
    "index.js",
    "index.d.ts",
    "runtime.js",
    "wasm/vooya_app.js",
    "wasm/vooya_app_bg.wasm",
  ];
  for (const file of expected) {
    if (!existsSync(resolve(outputDir, file))) {
      throw new Error(`Vooya precompiled Vue artifact build did not produce expected output ${file}.`);
    }
  }
  const manifest: unknown = JSON.parse(readFileSync(resolve(outputDir, "manifest.json"), "utf8"));
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Vooya precompiled Vue artifact manifest must be an object.");
  }
  for (const [name, path] of Object.entries({
    wasm: "wasm" in manifest ? manifest.wasm : undefined,
    types: "types" in manifest ? manifest.types : undefined,
  })) {
    if (typeof path !== "string" || !path.startsWith("./") || !isArtifactRelativePath(path)) {
      throw new Error(`Vooya precompiled Vue artifact manifest ${name} must be a package-relative path.`);
    }
    const asset = resolve(outputDir, path);
    if (!isPathInside(asset, outputDir) || !isFile(asset)) {
      throw new Error(`Vooya precompiled Vue artifact manifest ${name} must reference a file in dist: ${String(path)}.`);
    }
  }
  for (const file of artifactFiles(outputDir)) {
    if (file.includes(".vooya") || file.includes(".artifact-build") || file.endsWith(".rs") || file.endsWith("Cargo.toml")) {
      throw new Error(`Vooya precompiled Vue artifact must not include build input ${file}.`);
    }
    const content = readFileSync(resolve(outputDir, file));
    if (content.includes(Buffer.from(outputDir))) {
      throw new Error(`Vooya precompiled Vue artifact must not include an absolute output path in ${file}.`);
    }
  }
}

function isFile(path: string) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function artifactFiles(directory: string, prefix = ""): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}${entry.name}`;
    return entry.isDirectory() ? artifactFiles(resolve(directory, entry.name), `${path}/`) : [path];
  });
}

function isArtifactRelativePath(path: string) {
  return !path.includes("\\") && !path.split("/").includes("..") && !isAbsolute(path);
}

function isSemverVersion(version: string) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version);
}

function isPathInside(path: string, directory: string) {
  const relativePath = relative(directory, path);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}
