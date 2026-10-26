import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "vite";
import { compile } from "svelte/compiler";
import { JSDOM } from "jsdom";

test("Svelte routes synchronous and asynchronous loader, factory and Store attachment failures to onError", async () => {
  const temporary = await mkdtemp(fileURLToPath(new URL("../.lifecycle-", import.meta.url)));
  const dom = new JSDOM("<body></body>", { url: "http://localhost/" });
  for (const key of ["window", "document", "Node", "Element", "HTMLElement", "Text", "Comment", "CustomEvent"]) {
    globalThis[key] = dom.window[key];
  }
  try {
    const adapter = fileURLToPath(new URL("../dist/index.js", import.meta.url));
    const output = join(temporary, "runtime.mjs");
    const entry = join(temporary, "entry.js");
    const packageRoot = fileURLToPath(new URL("..", import.meta.url));
    await writeFile(entry, `
      import { mount, unmount, flushSync } from "svelte";
      import { defineVooyaComponent } from ${JSON.stringify(adapter)};
      import StoreProbe from "store-probe.svelte";
      export function run(target, kind, factory, onError, onBinding = () => {}) {
        const Component = kind === "store" ? StoreProbe : defineVooyaComponent({
          contract: { abiVersion: 1, name: "FailedLoader", props: [], events: [] },
          loadBindings: factory,
        });
        const instance = mount(Component, { target, props: { factory, onError, onBinding } });
        flushSync();
        return () => unmount(instance);
      }
    `);
    await build({
      configFile: false, root: packageRoot, logLevel: "silent",
      build: {
        lib: { entry, formats: ["es"], fileName: () => "runtime.mjs" },
        outDir: temporary, emptyOutDir: false, minify: false,
      },
      plugins: [{
        name: "svelte-runtime-test",
        resolveId(id) { if (id === "store-probe.svelte") return "\0store-probe.svelte"; },
        load(id) {
          if (id === "\0store-probe.svelte") {
            return `<script>import { useVooyaStore } from ${JSON.stringify(adapter)}; export let factory; export let onError; export let onBinding; onBinding(useVooyaStore(factory, undefined, { onError }));</script>`;
          }
        },
        transform(source, id) {
          if (id.endsWith(".svelte")) return compile(source, { filename: id, generate: "client" }).js.code;
        },
      }],
    });
    const { run } = await import(pathToFileURL(output));
    for (const kind of ["store", "component"]) {
      for (const asynchronous of [false, true]) {
        const cause = new Error(`${kind} unavailable`);
        const errors = [];
        const stop = run(document.body, kind, () => {
          if (asynchronous) return Promise.reject(cause);
          throw cause;
        }, (error) => errors.push(error));
        try {
          await new Promise((resolve) => setImmediate(resolve));
          assert.deepEqual(errors, kind === "store" ? [cause] : [{ stage: "load", cause }]);
        } finally {
          await stop();
        }
      }
    }
    for (const stage of ["getSnapshot", "subscribe"]) {
      const cause = new Error(stage);
      const errors = [];
      let disposed = 0;
      let binding;
      let value;
      const stop = run(document.body, "store", () => ({
        getSnapshot: () => 1,
        subscribe: () => () => {},
        dispose() { disposed++; throw new Error("cleanup failed"); },
        [stage]() { throw cause; },
      }), (error) => errors.push(error), (result) => { binding = result; });
      const unsubscribe = binding.state.subscribe((next) => { value = next; });
      try {
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(errors, [cause]);
        assert.equal(binding.store, undefined);
        assert.equal(value, undefined);
      } finally {
        unsubscribe();
        await stop();
      }
      assert.equal(disposed, 1);
    }
    {
      const cause = new Error("snapshot failed");
      const errors = [];
      let value = 1;
      let mirrored;
      let listener;
      let binding;
      const stop = run(document.body, "store", () => ({
        getSnapshot() { if (value === 2) throw cause; return value; },
        subscribe(next) { listener = next; return () => { listener = undefined; }; },
        dispose() {},
      }), (error) => errors.push(error), (result) => { binding = result; });
      const unsubscribe = binding.state.subscribe((next) => { mirrored = next; });
      try {
        await new Promise((resolve) => setImmediate(resolve));
        value = 2;
        listener();
        assert.deepEqual(errors, [cause]);
        assert.equal(mirrored, 1);
        value = 3;
        listener();
        assert.equal(mirrored, 3);
      } finally {
        unsubscribe();
        await stop();
      }
      assert.equal(listener, undefined);
    }
    {
      const errors = [];
      let resolveStore;
      let disposed = 0;
      const stop = run(document.body, "store", () => new Promise((resolve) => {
        resolveStore = resolve;
      }), (error) => errors.push(error));
      await stop();
      resolveStore({
        getSnapshot() { assert.fail("late store must not attach"); },
        subscribe() { assert.fail("late store must not subscribe"); },
        dispose() { disposed++; throw new Error("late cleanup failed"); },
      });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(disposed, 1);
      assert.deepEqual(errors, []);
    }
    for (const fails of [false, true]) {
      const errors = [];
      let mounts = 0;
      let settle;
      const stop = run(document.body, "component", () => new Promise((resolve, reject) => {
        settle = () => fails ? reject(new Error("late failure")) : resolve({ mount() { mounts++; return { dispose() {} }; } });
      }), (error) => errors.push(error));
      await stop();
      settle();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(mounts, 0);
      assert.deepEqual(errors, []);
    }
  } finally {
    dom.window.close();
    await rm(temporary, { recursive: true, force: true });
  }
});
