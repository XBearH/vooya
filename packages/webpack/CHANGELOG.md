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

- Generate Vue/React components using the shared component bridge object. This release does not add Solid/Svelte source authoring to Webpack.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.12`, `@vooya/compiler@0.1.0-alpha.12`.

## 0.1.0-alpha.11

- Update the shared compiler/build-core dependencies for alpha.11; Webpack adapter implementation is unchanged from alpha.10.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.11`, `@vooya/compiler@0.1.0-alpha.11`.

## 0.1.0-alpha.10

- Update shared build dependencies for Rust authoring and scoped-style fixes; the adapter support boundary remains experimental Vue/React `.voo` authoring.
- Invalidate the component loader through a generation marker when Rust dependencies change but the `.voo` source does not.
- Remove the deprecated `cacheRoot` option; use `workspaceRoot`.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.10`, `@vooya/compiler@0.1.0-alpha.10`.

## 0.1.0-alpha.9

- First experimental Webpack 5 integration for Vue/React source `.voo` components, including production output, browser lifecycle coverage, watched Rust path dependencies, and recovery after Rust build failures.
- Keep generated state and declarations in the disposable `.vooya/` workspace.
- Published internal dependencies: `@vooya/build-core@0.1.0-alpha.9`, `@vooya/compiler@0.1.0-alpha.9`.
