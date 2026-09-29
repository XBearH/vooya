# Language Provider Research

This record scopes the post-beta research in [Issue #94](https://github.com/vooyajs/vooya/issues/94).
It is not an implementation of a second authoring language or a change to the
beta support matrix.

## Current Boundary

Vooya beta is Rust-only. Rust source files, Cargo, `wasm-bindgen`, Rust schema
records, and Rust diagnostics are the only supported source-authoring path.
A language is not supported merely because it can compile to WebAssembly or
because an experiment can load its output in a browser.

`@vooya/build-core` is bundler-neutral, but it is not yet language-neutral. Its
current build path owns Rust source discovery, generated Cargo manifests, Cargo
execution, `wasm-bindgen`, Rust schema extraction, declaration generation, and
Rust diagnostic mapping. A future provider seam must move those language-owned
steps out without changing the host-facing lifecycle contract.

## Proposed Split

The future architecture has two layers:

| Layer | Owns | Must not own |
| --- | --- | --- |
| Language provider | Source discovery, toolchain policy, compilation, language runtime assets, language diagnostics, source maps, dependency/watch inputs, and conversion into the Vooya ABI contract | Framework-specific mounting or a bundler's virtual-module API |
| Normalized artifact | Runtime entry points, WASM and auxiliary assets, contract metadata, declarations, environment requirements, watch files, and normalized diagnostics | Cargo, Rust macros, a particular compiler, or a requirement that all providers instantiate WASM directly |
| Bundler integration | Virtual modules, asset emission, development invalidation, error presentation, and adapter imports | Source compilation details for a particular language |
| Framework adapter | Component/store lifecycle, event delivery, prop updates, disposal, and framework-native state containers | Provider toolchain selection or language runtime loading policy |

The provider loader remains provider-specific. For example, an Emscripten
provider can require generated JavaScript, workers, and data files; a Go
provider can require its version-matched support script; a managed runtime can
ship additional runtime assets. A single generated `WebAssembly.instantiate()`
call is not a sufficient universal loader contract.

## Normalized Artifact Requirements

Before extracting a provider, define a versioned artifact manifest with at
least these fields:

| Field | Purpose |
| --- | --- |
| `schemaVersion` and ABI versions | Reject incompatible artifacts deterministically |
| Runtime entry | Identify the provider-supplied JavaScript module and its loading contract |
| Assets | Describe WASM, JavaScript, CSS, worker, data, source-map, and runtime files with stable identities |
| Contracts and declarations | Provide component/store metadata and generated TypeScript declarations without requiring Rust macros |
| Environment requirements | State browser, worker, threading, COOP/COEP, runtime, and offline-asset requirements explicitly |
| Watch inputs | Let bundlers invalidate on authored source, provider dependencies, manifests, and generated input changes |
| Diagnostics | Normalize severity, source location, rendered message, and generated-to-authored mappings |
| Cache identity | Include provider version, toolchain inputs, build mode, and relevant environment so stale artifacts cannot be reused |

The manifest is an internal proposal until an RFC assigns its wire format and
compatibility policy. It must support precompiled artifacts as well as source
providers; a precompiled consumer must not require Cargo or a source provider.

## Rust Reference Provider

Rust is the first extraction target. The refactor must preserve existing public
behavior before another provider is introduced:

- ordinary `.rs` component and store authoring remains unchanged;
- `toolchain.cargoPath` and `vooya doctor` continue to select and diagnose one
  coherent Cargo/rustc/target/`wasm-bindgen` toolchain;
- generated workspace paths, `vooya clean`, metadata, declarations, and
  diagnostics remain compatible with beta consumers;
- Vite remains the primary source-authoring evidence path;
- the existing Rust lifecycle, ABI, CSS, watch, failure-recovery, and browser
  fixtures pass without a new user configuration value; and
- no adapter imports Cargo, Rust schema parsing, or `wasm-bindgen` directly
  after the extraction boundary is complete.

The first implementation should add provider-shaped internal interfaces beside
the current Rust implementation, then migrate callers behind those interfaces.
It must not introduce a public `provider` option until a second implementation
passes the same conformance cases.

## Canary Evidence

Two deliberately different experiments are needed to validate the seam rather
than merely duplicate Rust's output shape.

### AssemblyScript Store Canary

An AssemblyScript provider should implement the shared store case with snapshot
`{ value: i32, label: string }`, `add(delta)`, and `reset()` actions. It must
prove one notification per change, generated Vue and React hooks with the same
shape as Rust stores, deterministic disposal, and clean development and
production builds. AssemblyScript is TypeScript-like; ordinary TypeScript is
not automatically a Vooya source language.

### Emscripten Worker Canary

An Emscripten C/C++ provider should wrap one small real image or parsing
library in a worker. It must prove provider JavaScript glue, multiple emitted
assets, asynchronous failure cleanup, typed values without silent coercion,
source diagnostics, cache invalidation, production/offline loading, and
COOP/COEP behavior when pthreads are enabled.

Passing either canary makes that provider experimental evidence only. Neither
canary changes the beta Rust-only support boundary.

## Explicit Non-goals

- Supporting arbitrary WebAssembly as a Vooya component.
- Treating WASI as a browser DOM integration or requiring every provider to use
  the WebAssembly Component Model.
- Reimplementing framework adapters for each language.
- Promising offline execution unless all required assets, runtimes, standard
  libraries, packages, and data files are deployed or cached.
- Running untrusted provider output without a separate sandbox and resource
  model.
- Promoting Lab or community experiments to first-party support without a
  provider, documentation, release status, and automated evidence.

## Exit Criteria

The research can advance to an architecture RFC only when it specifies the
artifact manifest, provider lifecycle, cache and clean behavior, watch and
diagnostic model, and compatibility policy. The first implementation stage is
complete only when the Rust reference provider preserves beta fixtures and a
precompiled artifact can be consumed without Cargo. AssemblyScript and
Emscripten require the same lifecycle and ABI conformance suite before either
is described as an experimental first-party provider.
