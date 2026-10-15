import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("useVooyaStore mirrors snapshots and disposes an owned instance", async () => {
  const dom = new JSDOM("<div id='app'></div>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  const { createApp, defineComponent, h, nextTick } = await import("vue");
  const { useVooyaStore } = await import("../dist/index.js");

  let value = 0;
  let listener;
  let disposed = false;
  const store = {
    getSnapshot: () => value,
    subscribe(next) { listener = next; return () => { listener = undefined; }; },
    increment() { value += 1; listener?.(); },
    dispose() { disposed = true; },
  };
  let consumed;
  const app = createApp(defineComponent({
    setup() {
      consumed = useVooyaStore(store, { disposeOnUnmount: true });
      return () => h("span", String(consumed.snapshot.value));
    },
  }));
  app.mount(dom.window.document.querySelector("#app"));
  assert.equal(dom.window.document.querySelector("span").textContent, "0");
  consumed.dispatch("increment");
  await nextTick();
  assert.equal(dom.window.document.querySelector("span").textContent, "1");
  app.unmount();
  assert.equal(disposed, true);
  dom.window.close();
});

test("useVooyaStore disposes a store that resolves after unmount", async () => {
  const dom = new JSDOM("<div id='app'></div>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  const { createApp, defineComponent, h, nextTick } = await import("vue");
  const { useVooyaStore } = await import("../dist/index.js");

  let resolveStore;
  let disposed = false;
  const source = new Promise((resolve) => { resolveStore = resolve; });
  const store = {
    getSnapshot: () => 1,
    subscribe: () => () => {},
    dispose: () => { disposed = true; },
  };
  const app = createApp(defineComponent({
    setup() {
      useVooyaStore(source, { disposeOnUnmount: true });
      return () => h("span", "pending");
    },
  }));
  app.mount(dom.window.document.querySelector("#app"));
  app.unmount();
  resolveStore(store);
  await nextTick();
  assert.equal(disposed, true);
  dom.window.close();
});

test("useVooyaStore does not report a late factory failure after unmount", async () => {
  const dom = new JSDOM("<div id='app'></div>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  const { createApp, defineComponent, h, nextTick } = await import("vue");
  const { useVooyaStore } = await import("../dist/index.js");

  let rejectSource;
  const source = new Promise((resolve, reject) => { rejectSource = reject; });
  const errors = [];
  const app = createApp(defineComponent({
    setup() {
      useVooyaStore(source, { onError: (cause) => errors.push(cause) });
      return () => h("span", "pending");
    },
  }));
  app.mount(dom.window.document.querySelector("#app"));
  app.unmount();
  rejectSource(new Error("late failure"));
  await nextTick();
  assert.deepEqual(errors, []);
  dom.window.close();
});

test("optional Boolean props preserve absence, null and explicit defaults", async () => {
  const dom = new JSDOM("<div id='app'></div>");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  const { createApp, defineComponent, h, nextTick, ref } = await import("vue");
  const { defineVooyaComponent } = await import("../dist/index.js");
  const supplied = ref({});
  const mounted = [];
  const updates = [];
  let disposed = 0;
  const Component = defineVooyaComponent({
    contract: {
      abiVersion: 1, name: "OptionalFlag", events: [],
      props: [
        { name: "flag", type: "boolean", required: false },
        { name: "defaulted", type: "boolean", required: false, defaultValue: true },
      ],
    },
    async loadBindings() {
      return { mount(_host, ...values) {
        mounted.push(values);
        return {
          update_flag(value) { updates.push(value); },
          update_defaulted() {},
          dispose() { disposed += 1; },
        };
      } };
    },
  });
  const app = createApp(defineComponent({ setup: () => () => h(Component, supplied.value) }));
  try {
    app.mount(dom.window.document.querySelector("#app"));
    await nextTick();
    assert.deepEqual(mounted, [[undefined, true]]);
    for (const value of [false, true, null]) {
      supplied.value = { flag: value };
      await nextTick();
    }
    supplied.value = {};
    await nextTick();
    assert.deepEqual(updates, [false, true, null, undefined]);
  } finally {
    app.unmount();
    dom.window.close();
  }
  assert.equal(disposed, 1);
});

test("Store attachment failures respect ownership and notification failures can recover", async () => {
  const dom = new JSDOM("<div id='app'></div>");
  for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement"]) {
    globalThis[key] = dom.window[key];
  }
  const { createApp, h } = await import("vue");
  const { useVooyaStore } = await import("../dist/index.js");
  try {
    for (const asynchronous of [false, true]) {
      for (const stage of ["getSnapshot", "subscribe"]) {
        for (const owned of [false, true]) {
          const cause = new Error(stage);
          const errors = [];
          let disposed = 0;
          let binding;
          const store = {
            getSnapshot: () => 1,
            subscribe: () => () => {},
            dispose() { disposed++; throw new Error("cleanup failed"); },
            [stage]() { throw cause; },
          };
          const app = createApp({ setup() {
            binding = useVooyaStore(asynchronous ? Promise.resolve(store) : store, {
              disposeOnUnmount: owned, onError: (error) => errors.push(error),
            });
            return () => h("span");
          } });
          app.mount(document.querySelector("#app"));
          try {
            await new Promise((resolve) => setImmediate(resolve));
            assert.deepEqual(errors, [cause]);
            assert.equal(binding.snapshot.value, undefined);
            assert.throws(() => binding.dispatch("add", 1), /not ready/);
          } finally {
            app.unmount();
          }
          assert.equal(disposed, owned ? 1 : 0);
        }
      }
    }
    let listener;
    let value = 1;
    const cause = new Error("snapshot failed");
    const errors = [];
    let binding;
    const app = createApp({ setup() {
      binding = useVooyaStore({
        getSnapshot() { if (value === 2) throw cause; return value; },
        subscribe(next) { listener = next; return () => { listener = undefined; }; },
        dispose() {},
      }, { onError: (error) => errors.push(error) });
      return () => h("span");
    } });
    app.mount(document.querySelector("#app"));
    try {
      value = 2;
      listener();
      assert.deepEqual(errors, [cause]);
      assert.equal(binding.snapshot.value, 1);
      value = 3;
      listener();
      assert.equal(binding.snapshot.value, 3);
    } finally {
      app.unmount();
    }
    assert.equal(listener, undefined);
  } finally {
    dom.window.close();
  }
});
