# Browser IDE Experiment

This page defines a bounded experiment for [Issue #181](https://github.com/vooyajs/vooya/issues/181).
It is a planning and evidence contract, not a claim that Vooya currently
supports browser Rust compilation, remote compilation, or offline language
environments.

## First Slice

Start with a documentation playground that edits host code and inputs around a
precompiled Vooya component. This gives the project a useful browser experience
without pretending that a native Rust toolchain can run in a browser.

The first slice should have:

- one real Component or Store example already covered by a repository or Lab
  fixture;
- an editor for a bounded set of host files and configuration values;
- run, stop, reset and export actions;
- a preview isolated from the documentation page;
- visible loading, build/asset, runtime and disposal errors;
- a recorded environment identity, asset revision and support limitations.

Editing Rust source and compiling it in the browser is a separate experiment.
The precompiled playground may be shipped earlier, but it must say that users
are editing host code and inputs only. A remote compiler is online-only and
must not be presented as offline source compilation.

## Boundary Contract

The host application owns:

- routing, documentation, project identity and persistence;
- filesystem, network, account and credential access;
- editor state, export/download and user approval of actions;
- choosing whether a build runs locally, remotely or in a browser worker.

The Vooya capability owns only its declared component/store boundary:

- typed props, snapshots, events, actions and errors;
- readiness, cancellation, updates and disposal;
- its declared runtime assets and environment requirements.

Do not pass an implicit checkout, token, arbitrary filesystem handle or network
authority to WASM. A browser execution environment must use an explicit virtual
file set and a capability-scoped API. Preview code should run in a separate
document or worker boundary where appropriate, with no assumption that Workers
alone provide security isolation.

## Environment Manifest

Every example environment should be identified by a versioned record containing:

- example and contract version;
- provider/runtime and tool versions;
- complete JS, WASM, CSS, worker, data and dependency assets;
- browser features and headers such as COOP/COEP when required;
- online/offline requirements and cache key;
- maximum source size, memory, runtime and rebuild limits;
- known unsupported language features and packages.

Offline mode is valid only after a fresh-profile test downloads and verifies the
complete environment, disconnects the network, reloads the playground, edits a
supported example, rebuilds, runs, stops and exports it. Caching a compiler
file without its standard library, dependencies and runtime assets is not
offline support.

## Acceptance Evidence

The first experiment should record:

1. cold and warm download size, startup time, rebuild time and peak memory;
2. stop/restart behavior for a stuck build or preview;
3. cancellation while loading or rebuilding, with no late result updating a
   newer run;
4. repeated mount, update, error, stop and disposal cycles;
5. two previews with independent state and no cross-project event delivery;
6. export followed by a clean local continuation path;
7. browser and deployment requirements for every named example.

Use a plain JavaScript or precompiled-WASM baseline for measurements. Do not
make performance claims from a single demo or compare browser compilation to a
native toolchain without recording equivalent inputs and output quality.

## Deferred Decisions

Keep these out of the first slice until evidence requires them:

- arbitrary Rust crates and unrestricted Cargo builds;
- untrusted user code without a separate sandbox/resource model;
- remote compilation as a substitute for offline execution;
- collaborative editing, account-wide project storage or a general agent API;
- multiple language environments, WASI as a DOM contract, and a universal
  WebAssembly loader;
- full desktop IDE replacement.

The first successful result is a user changing a real supported example and
reviewing its behavior without local setup. Findings that reveal a missing
compiler, ABI, lifecycle, adapter, asset or diagnostic contract should return to
the owning Vooya issue and receive an automated fixture before expanding a
support claim. Interactive case presentation and product-specific UI remain
Vooya Lab responsibilities under [RFC 0011](../rfcs/0011-lab-self-hosting-program.md).
