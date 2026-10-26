# Changelog

Historical entries were reconstructed from published package metadata and release
snapshots; see [release history evidence](../../docs/maintainers/release-history.md).

## 0.2.0-alpha.0

### Patch Changes

- 7fe6eb1: Resolve Rust imports through Vite so project-root paths and aliases work. Update
  Rust component styles during development and allow failed WASM loads to retry
  when components are mounted again.
  
  Propagate Store action errors when the Rust return type uses `std::result::Result`
  or `core::result::Result`, just as for the short `Result` spelling.
- c318524: Allow a Store change listener to dispose its own generated Store instance without
  holding the generated handle table borrow across synchronous notifications.
- 7bc0a50: Report unsupported fields and recursive references in resolved Store snapshot schemas instead of silently degrading their declarations. Diagnostics identify the field path and use additive Rust source positions when available; failed builds preserve the previous successful artifacts. Existing schema-v1 producers remain readable without source positions. Missing schema metadata remains explicitly unknown, including hand-written ToJs values that the current protocol cannot distinguish from missing metadata.

## 0.1.0-beta.0

### Patch Changes

- cca8100: Prepare the first 0.1 beta package set for Rust-file authoring. Keep internal
  dependencies aligned with the reviewed beta versions. Vue and React with Vite
  remain the supported path; experimental adapters retain their documented limits.
  Authors still provide a Rust/WASM toolchain; managed preset installation is
  planned separately for 0.2.
- c4a2698: Generate concrete TypeScript interfaces for derived Rust structs and unit enums
  used in component props, events, and Store snapshots. Preserve each framework's
  native Store state container. Missing schemas remain `unknown`; a known struct
  with unrepresentable fields falls back to `Record<string, unknown>` rather than
  promising an unverified shape. Includes the implementation merged in PR #122.

## 0.1.0-alpha.12

- The packaged authoring macros support an opt-in in-place component update hook for Canvas and other stateful browser surfaces.

## 0.1.0-alpha.11

- Coordinated alpha release; Rust runtime implementation is unchanged from alpha.10.

## 0.1.0-alpha.10

- Ship Rust authoring and macro crates alongside the browser runtime for installed source consumers.
- Add disposable signal subscriptions, batched transactions, reentrancy protection, tracked reactive effects, and keyed child reconciliation.
- Add signal-backed text/attributes, owned event bindings, host event emission, conditionals, and keyed loops to Rust `rsx!` authoring.

## 0.1.0-alpha.9

- Coordinated alpha release; browser runtime implementation is unchanged from alpha.8.

## 0.1.0-alpha.8

- Ship complete package metadata for the shared build-core integration; browser runtime behavior is unchanged from alpha.7.

## 0.1.0-alpha.7

- Adopt Semifold for coordinated alpha releases; browser runtime behavior is unchanged from alpha.6.

## 0.1.0-alpha.6

- Coordinated alpha release; browser runtime implementation is unchanged from alpha.5.

## 0.1.0-alpha.5

- Ship MIT and Apache-2.0 license texts in the package.

## 0.1.0-alpha.4

- Add mount cleanup callbacks that execute once in reverse order, including cleanup after a failed mount.

## 0.1.0-alpha.3

- Coordinated alpha release alongside adapter teardown and Vite HMR fixes; runtime source is unchanged from alpha.2.

## 0.1.0-alpha.2

- Unify public runtime branding and Rust crate references under Vooya.

## 0.1.0-alpha.1

- Ship Rust runtime sources and the `./rust/Cargo.toml` export for application-specific `.voo` compilation, with the structured Rust view API.

## 0.1.0-alpha.0

- Initial npm publication of the browser WASM runtime and generated JavaScript entry.
