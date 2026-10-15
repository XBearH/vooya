import assert from "node:assert/strict";
import test from "node:test";
import loader from "../dist/loader.js";
import { deleteBuildState, setBuildState } from "../dist/state.js";
import { vooyaWebpack } from "../dist/index.js";

test("source loader rule only handles ordinary Rust files", () => {
  const rule = vooyaWebpack().rule();
  assert.equal(rule.test.test("Counter.rs"), true);
  assert.equal(rule.test.test("Counter.ts"), false);
});

test("loader returns the current prepared Rust module and disables caching", () => {
  const instanceId = "loader-cache-test";
  const resourcePath = "/app/Counter.rs";
  const calls = [], dependencies = [];
  setBuildState(instanceId, { runtimeModule: "/cache/vooya_app-next.js",
    workspaceRoot: "/app/.vooya", rustModules: new Map([[resourcePath, "export default 'next';"]]),
    generationFile: "/app/.vooya/cache/generation", watchedRoots: [], styleDependencies: [],
    wasm: new Uint8Array(), wasmAssetName: "vooya_app-next.wasm" });
  try {
    const context = { resourcePath, cacheable(value) { calls.push(value); },
      getOptions() { return { instanceId }; }, addDependency(path) { dependencies.push(path); } };
    assert.equal(loader.call(context), "export default 'next';");
    assert.deepEqual(calls, [false]);
    assert.ok(dependencies.includes(resourcePath));
    context.resourcePath = "/app/Missing.rs";
    assert.throws(() => loader.call(context), /Check rust.sourceRoot and rust.entry/);
  } finally { deleteBuildState(instanceId); }
});
