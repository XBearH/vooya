# `@vooya/solid`

Solid host adapter for Vooya Rust components and instance-scoped stores.

The current adapter range is Solid `>=1.9 <2`. It is experimental and its
end-to-end evidence is the Vite 7 Rust-file fixture; this README does not imply
Rspack/Webpack, SSR, or hydration support.

```sh
npm install @vooya/solid@beta
npm install --save-dev @vooya/vite@beta
```

Configure it after `vite-plugin-solid`:

```ts
import { vooya } from "@vooya/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid(), vooya({ framework: "solid" })],
});
```

Use the generated exports from an ordinary Rust file:

```tsx
import Counter from "./Counter.rs";
import { useCart } from "./Store.rs";

export function App() {
  const { state, add } = useCart();
  return (
    <>
      <Counter count={state()?.count ?? 0} onSelected={console.log} />
      <button onClick={() => add(1)}>Add</button>
    </>
  );
}
```

`state` is a Solid accessor because the WASM store loads asynchronously. The
generated `useName` API owns one Rust Store instance and disposes it with the
current Solid owner. `undefined` means the Store is not ready yet.

The generator passes a framework-neutral contract/bindings bridge to this
adapter. The bridge keeps generated names, actions, ABI, and disposal rules
aligned with Vue, React, and Svelte; Solid still uses its native `Accessor` and
owner cleanup instead of imitating a Vue `Ref`, React snapshot, or Svelte
`Readable`.

`useVooyaStore(factory, props, options?)` remains an advanced adapter API for
custom ownership. The generated `useName()` entry is the normal application
path. Package unit tests cover snapshot publication, unsubscribe/disposal, and
a Store that resolves after its owner has already been disposed.

Current development source routes Store creation, initial snapshot, and
subscription failures to `onError`, clears the failed binding, and releases
owned instances once. Notification snapshot failures retain the last good
state and allow later notifications to recover. Cleanup always attempts disposal
even if unsubscribe throws; cleanup errors during failed attachment preserve
the original error. Normal unmount cleanup errors follow the framework's
lifecycle error handling. These changes are not yet released.

Late initialization releases the instance without attaching it; late errors
and custom factory callbacks do not notify a destroyed owner.

See the [framework capability matrix](https://github.com/vooyajs/vooya/blob/main/docs/project/compatibility.md#beta-framework-capabilities)
for the beta support level and tested consumer paths.
