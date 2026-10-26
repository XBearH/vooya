// Webpack loads this file through its public loader protocol. Rust/WASM
// compilation remains in the plugin and shared build core.

import { getBuildState } from "./state.js";

interface RustLoaderContext {
  resourcePath: string;
  cacheable(value: boolean): void;
  getOptions(): { instanceId: string };
  addDependency(path: string): void;
}

export default function vooyaWebpackLoader(this: RustLoaderContext): string {
  // The wrapper includes the current generated runtime path, so it must not be
  // restored from Webpack's persistent loader cache after a Rust rebuild.
  this.cacheable(false);
  const { instanceId } = this.getOptions();
  const state = getBuildState(instanceId);
  if (!state) {
    throw new Error(
      "Vooya Webpack loader ran before its build plugin prepared the Rust/WASM artifact.",
    );
  }
  // The source module can remain byte-for-byte identical while a Rust
  // dependency produces a new WASM runtime. Depend on the stable generation
  // marker so Webpack reruns this loader and points at the latest runtime.
  this.addDependency(state.generationFile);
  this.addDependency(this.resourcePath);
  const module = state.rustModules.get(this.resourcePath);
  if (!module) throw new Error(`No Vooya component or store found for ${this.resourcePath}. Check rust.sourceRoot and rust.entry.`);
  return module;
}
