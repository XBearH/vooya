# Changelog

Historical entries were reconstructed from published package metadata and release
snapshots; see [release history evidence](../../docs/maintainers/release-history.md).

## 0.1.0-beta.0

### Patch Changes

- cca8100: Prepare the first 0.1 beta package set for Rust-file authoring. Keep internal
  dependencies aligned with the reviewed beta versions. Vue and React with Vite
  remain the supported path; experimental adapters retain their documented limits.
  Authors still provide a Rust/WASM toolchain; managed preset installation is
  planned separately for 0.2.
- Updated dependencies [cca8100]
- Updated dependencies [c4a2698]
- Updated dependencies [c4a2698]
- Updated dependencies [1e3e000]
  - @vooya/build-core@0.1.0-beta.0
  - @vooya/compiler@0.1.0-beta.0

## 0.1.0-alpha.13

- Use build-core alpha.13 for conventional multi-file Rust module lookup and authored diagnostic locations.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.13`, `@vooya/compiler@0.1.0-alpha.12`.

## 0.1.0-alpha.12

- Generate Vue/React components using the shared component bridge object. This release does not add Solid/Svelte source authoring to Rspack.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.12`, `@vooya/compiler@0.1.0-alpha.12`.

## 0.1.0-alpha.11

- Update the shared compiler/build-core dependencies for alpha.11; Rspack adapter implementation is unchanged from alpha.10.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.11`, `@vooya/compiler@0.1.0-alpha.11`.

## 0.1.0-alpha.10

- Update shared build dependencies for Rust authoring and scoped-style fixes; the adapter support boundary remains experimental Vue/React `.voo` authoring.
- Remove the deprecated `cacheRoot` option; use `workspaceRoot`.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.10`, `@vooya/compiler@0.1.0-alpha.10`.

## 0.1.0-alpha.9

- Use the disposable `.vooya/` workspace and generated declaration paths.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.9`, `@vooya/compiler@0.1.0-alpha.9`.

## 0.1.0-alpha.8

- First experimental Rspack 2.1/Rsbuild integration for Vue/React source `.voo` components using the shared Rust/WASM build core.
- Support watched Rust dependencies, content-addressed WASM/runtime modules, development reload, and mapped diagnostics.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.8`, `@vooya/compiler@0.1.0-alpha.8`.
