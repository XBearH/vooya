import assert from "node:assert/strict";
import test from "node:test";
import { createRoot } from "solid-js";

import { useVooyaStore } from "../dist/index.js";

test("mirrors store snapshots and disposes with the Solid owner", async () => {
  let count = 0;
  let listener;
  let disposed = 0;
  let binding;
  let disposeOwner;

  createRoot((dispose) => {
    disposeOwner = dispose;
    binding = useVooyaStore(
      async () => ({
        getSnapshot: () => ({ count }),
        subscribe: (next) => {
          listener = next;
          return () => { listener = undefined; };
        },
        dispose: () => { disposed += 1; },
      }),
      undefined,
    );
  });

  await Promise.resolve();
  assert.deepEqual(binding.state(), { count: 0 });
  count = 2;
  listener();
  assert.deepEqual(binding.state(), { count: 2 });
  disposeOwner();
  assert.equal(listener, undefined);
  assert.equal(disposed, 1);
});

test("releases a late store once even if disposal throws", async () => {
  let resolveStore;
  let disposed = 0;
  let disposeOwner;
  const pending = new Promise((resolve) => { resolveStore = resolve; });
  const errors = [];

  createRoot((dispose) => {
    disposeOwner = dispose;
    useVooyaStore(() => pending, undefined, { onError: (cause) => errors.push(cause) });
  });
  disposeOwner();
  resolveStore({
    getSnapshot: () => ({}),
    subscribe: () => undefined,
    dispose() { disposed++; throw new Error("late cleanup failed"); },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(disposed, 1);
  assert.deepEqual(errors, []);
});

test("preserves a null snapshot before and after a Solid store action", async () => {
  let value = null;
  let listener;
  let binding;
  let disposeOwner;
  createRoot((dispose) => {
    disposeOwner = dispose;
    binding = useVooyaStore(async () => ({
      getSnapshot: () => value,
      subscribe(next) { listener = next; return () => { listener = undefined; }; },
      select(next) { value = next; listener?.(); },
      dispose() {},
    }), undefined);
  });
  try {
    assert.equal(binding.state(), undefined);
    await Promise.resolve();
    assert.equal(binding.state(), null);
    binding.store.select(7);
    assert.equal(binding.state(), 7);
    binding.store.select(null);
    assert.equal(binding.state(), null);
  } finally {
    disposeOwner();
  }
  assert.equal(listener, undefined);
});

for (const asynchronous of [false, true]) {
  test(`routes ${asynchronous ? "asynchronous" : "synchronous"} factory failures to onError`, async () => {
    const cause = new Error("store unavailable");
    const errors = [];
    let disposeOwner;
    try {
      createRoot((dispose) => {
        disposeOwner = dispose;
        useVooyaStore(() => {
          if (asynchronous) return Promise.reject(cause);
          throw cause;
        }, undefined, { onError: (error) => errors.push(error) });
      });
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(errors, [cause]);
    } finally {
      disposeOwner?.();
    }
  });
}

test("releases failed attachments once and preserves the original error", async () => {
  for (const stage of ["getSnapshot", "subscribe"]) {
    const cause = new Error(stage);
    const errors = [];
    let disposed = 0;
    let binding;
    let disposeOwner;
    createRoot((dispose) => {
      disposeOwner = dispose;
      binding = useVooyaStore(() => ({
        getSnapshot: () => 1,
        subscribe: () => () => {},
        dispose() { disposed++; throw new Error("cleanup failed"); },
        [stage]() { throw cause; },
      }), undefined, { onError: (error) => errors.push(error) });
    });
    try {
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(errors, [cause]);
      assert.equal(binding.store, undefined);
      assert.equal(binding.state(), undefined);
    } finally {
      disposeOwner();
    }
    assert.equal(disposed, 1);
  }
});

test("keeps the last snapshot after a notification error and recovers on the next notification", async () => {
  const cause = new Error("snapshot failed");
  const errors = [];
  let value = 1;
  let listener;
  let binding;
  let disposeOwner;
  createRoot((dispose) => {
    disposeOwner = dispose;
    binding = useVooyaStore(() => ({
      getSnapshot() { if (value === 2) throw cause; return value; },
      subscribe(next) { listener = next; return () => { listener = undefined; }; },
      dispose() {},
    }), undefined, { onError: (error) => errors.push(error) });
  });
  try {
    await Promise.resolve();
    value = 2;
    listener();
    assert.deepEqual(errors, [cause]);
    assert.equal(binding.state(), 1);
    value = 3;
    listener();
    assert.equal(binding.state(), 3);
  } finally {
    disposeOwner();
  }
  assert.equal(listener, undefined);
});

test("still disposes the Store when unsubscribe throws during owner cleanup", async () => {
  const cause = new Error("unsubscribe failed");
  let disposed = 0;
  let binding;
  let disposeOwner;
  createRoot((dispose) => {
    disposeOwner = dispose;
    binding = useVooyaStore(() => ({
      getSnapshot: () => 1,
      subscribe: () => () => { throw cause; },
      dispose() { disposed++; },
    }), undefined);
  });
  await Promise.resolve();
  assert.throws(disposeOwner, (error) => error === cause);
  assert.equal(binding.store, undefined);
  assert.equal(disposed, 1);
});
