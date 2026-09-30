# Turbopack Research

This post-beta research record addresses [Issue #38](https://github.com/vooyajs/vooya/issues/38).
It does not add a Turbopack compatibility claim, a Next.js adapter, or a
Turbopack entry in the compatibility matrix.

## Result

The documented Next.js/Turbopack extension surface is insufficient for the
current Vooya source-build contract. A Turbopack rule can invoke a loader that
returns JavaScript for a matching source file, but the documented loader
surface cannot coordinate the Rust/WASM build and assets that Vooya requires.

The smallest viable future boundary needs documented public hooks that can run
one shared build, emit its generated assets, register watched files, and report
recoverable mapped diagnostics. Until those hooks exist, an integration would
need undocumented or patched internals, an external daemon/file-copy protocol,
or an asset path outside the normal production graph.

## Investigated Boundary

The relevant documented Next.js configuration shape maps a source file to a
loader that returns JavaScript:

```js
// next.config.js
module.exports = {
  turbopack: {
    rules: {
      "*.voo": {
        loaders: ["./vooya-loader.js"],
        as: "*.js",
      },
    },
  },
};
```

The API was reviewed against the [Next.js Turbopack configuration
reference](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
for Next.js `16.3.6`. Turbopack is distributed with Next.js and does not expose
a standalone version in this repository. The investigation environment used
Node.js `v24.12.0`, npm `11.6.2`, and React `19.x` repository consumers.

This shape could transform source text into a client-side React module. It does
not establish that generated WASM, CSS, runtime JavaScript, declarations, or
ABI metadata enter the application output.

## Public API Blockers

Vooya's shared build result contains runtime JavaScript, WASM, generated CSS,
declarations, metadata, watched files, and mapped diagnostics. Existing Vite,
Webpack, and Rspack integrations invoke that build from a bundler lifecycle,
not independently for every imported source module.

The documented Turbopack loader boundary has these gaps:

- `emitFile` is unsupported, so the loader cannot emit generated WASM into the
  normal production asset graph.
- There is no documented compilation or plugin lifecycle hook equivalent to
  the hooks used by the existing Webpack and Rspack integrations to run one
  coordinated Rust/WASM build and publish its generated assets.
- The loader API does not expose repository-level watch registration for the
  shared build's Rust source and path-dependency watch roots.
- The documented surface does not provide the complete rebuild, failed-build
  recovery, and mapped-diagnostic lifecycle used by the current adapters.
- Partial `fs` support and missing loader features including `importModule`,
  `loadModule`, and loader-context `resolve` prevent a clean replacement for
  the adapter state model.

Copying WASM beside source files or serving it through an unrelated endpoint is
not equivalent to normal bundler asset emission. It would not meet the source
integration contract. Using private Next.js/Turbopack internals is outside this
research boundary.

## Production And Development

The paths have different blockers:

- **Production:** JavaScript transformation is representable by a loader, but
  generated WASM, CSS, runtime assets, declarations, and ABI metadata cannot be
  emitted through the documented API.
- **Development:** even if an external workaround copied production assets, the
  public loader rule does not provide watched-root registration, rebuild
  scheduling, failed-build recovery, or browser invalidation for Rust source
  and configured path dependencies.

No clean Next.js fixture or automated compatibility row is added because those
requirements cannot be verified through documented public extension points.
Webpack and Rspack evidence remains evidence for those bundlers only.

## Reproduction Gate

Revisit this conclusion only when Turbopack exposes the missing public hooks.
The next investigation must use a clean Next.js consumer, record exact
installed versions, and run:

```sh
node --version
npm --version
npx next --version
npm run dev
npm run build
npm run start
```

The fixture must import a local source component from a client component and
verify production asset emission, browser WASM initialization, mount, prop
update, event delivery, and disposal. Development must additionally verify
Rust and path-dependency watching, mapped diagnostics, failed-build recovery,
and a corrected source edit without restarting the server.
