// Rspack loads this file as an ESM loader. It intentionally owns only the
// framework wrapper; Rust/WASM compilation is performed by build-core in the plugin.

import { getBuildState } from "./state.js";

interface RustLoaderContext {
  resourcePath: string;
  cacheable(value: boolean): void;
  getOptions(): { instanceId: string };
  addDependency(path: string): void;
}

export default function vooyaRspackLoader(this: RustLoaderContext): string {
  // The rendered wrapper includes the plugin's current in-memory WASM build
  // identity, so it is not a pure function of the Rust source alone. Rspack's
  // persistent loader cache can otherwise retain the wrapper from the last
  // successful compilation after a Rust failure/recovery cycle.
  this.cacheable(false);
  const { instanceId } = this.getOptions();
  const state = getBuildState(instanceId);
  if (!state) {
    throw new Error("Vooya Rspack loader ran before its build plugin prepared the Rust/WASM artifact.");
  }
  this.addDependency(this.resourcePath);
  const module = state.rustModules.get(this.resourcePath);
  if (!module) throw new Error(`No Vooya component or store found for ${this.resourcePath}. Check rust.sourceRoot and rust.entry.`);
  return module;
}
