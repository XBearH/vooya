# Changelog

Historical entries were reconstructed from published package metadata and release
snapshots; see [release history evidence](../../docs/maintainers/release-history.md).

## 0.2.0-alpha.0

### Minor Changes

- ffdb8ce: Retire the custom component source format from the current development line.
  Compile ordinary Rust Components and Stores through schema-driven bindings in
  Vite, Webpack, and Rspack. Remove the old parser, formatter, loader branches,
  declaration exports, and `buildApplication({ components })` input. Migrate
  examples and acceptance fixtures to Rust and referenced CSS. Schema-generated
  React declarations retain the host `className` prop. Existing
  applications using removed inputs or APIs must follow the migration guide;
  historical releases retain their original behavior.

### Patch Changes

- 040fef3: Require patched CSS selector and TOML parsers to avoid excessive parsing time on large flat selectors and TOML documents. Raise the postcss-selector-parser minimum to 7.1.6 and pin smol-toml to 1.9.1 while preserving the existing CSS and Cargo manifest APIs.

## 0.1.0-beta.0

### Patch Changes

- cca8100: Prepare the first 0.1 beta package set for Rust-file authoring. Keep internal
  dependencies aligned with the reviewed beta versions. Vue and React with Vite
  remain the supported path; experimental adapters retain their documented limits.
  Authors still provide a Rust/WASM toolchain; managed preset installation is
  planned separately for 0.2.

## 0.1.0-alpha.12

- Generate Solid and Svelte component declarations.
- Include `load`, `mount`, `update`, and `dispose` in generated Vue/React lifecycle error types.

## 0.1.0-alpha.11

- Coordinated alpha release; compiler implementation is unchanged from alpha.10.

## 0.1.0-alpha.10

- Compile functional `:host(...)` selectors in scoped styles and reject unsupported forms with a source-oriented error.

## 0.1.0-alpha.9

- Reject mutable borrowed strings at the public component ABI boundary.

## 0.1.0-alpha.8

- Publish complete TypeScript declarations and remove duplicated generated JavaScript from source control.
- Preserve `//` inside quoted contract defaults and reject borrowed string types at the public ABI boundary.

## 0.1.0-alpha.7

- Adopt Semifold for coordinated alpha releases; compiler behavior is unchanged from alpha.6.

## 0.1.0-alpha.6

- Reject public integer types whose JavaScript representation would be unstable or unsafe.

## 0.1.0-alpha.5

- Author the compiler in strict TypeScript while retaining executable JavaScript package output.
- Ship MIT and Apache-2.0 license texts in the package.

## 0.1.0-alpha.4

- First standalone compiler publication, extracted from the Vite plugin: `.voo` parsing, Rust binding generation, scoped CSS, declarations, and formatting.
