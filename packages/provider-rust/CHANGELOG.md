# @vooya/provider-rust

## 0.2.0-alpha.1

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
- 7fe6eb1: Allow generated Rust component and Store modules to retry WASM loading after a failed request. Keep pending and successful initialization shared across consumers.
- c94d8fc: Match Rust macro export names for components and Stores containing acronyms, so names such as `HTTPView` and `HTTPClient` load their WASM bindings correctly.
- 7bc0a50: Report unsupported fields and recursive references in resolved Store snapshot schemas instead of silently degrading their declarations. Diagnostics identify the field path and use additive Rust source positions when available; failed builds preserve the previous successful artifacts. Existing schema-v1 producers remain readable without source positions. Missing schema metadata remains explicitly unknown, including hand-written ToJs values that the current protocol cannot distinguish from missing metadata.
- Updated dependencies [040fef3]
- Updated dependencies [ffdb8ce]
- Updated dependencies [7fe6eb1]
- Updated dependencies [c318524]
- Updated dependencies [7bc0a50]
  - @vooya/compiler@0.2.0-alpha.0
  - @vooya/core@0.2.0-alpha.0

## 0.2.0-alpha.0

### Minor Changes

- 4230642: Move Rust compilation, schema handling, workspace management, and toolchain
  selection into `@vooya/provider-rust`. Keep `@vooya/build-core` as a compatible
  entry point sharing the same functions, error classes, and cache. Existing
  Rust projects need no configuration changes. This extraction does not add a
  public provider registry or support for another source language.

### Patch Changes

- d2f41cf: Normalize public module paths as well as their source-root prefix so dot segments do not suppress Rust root exports.

## 0.0.0

Unpublished package. Rust build implementation extracted from `@vooya/build-core`.
