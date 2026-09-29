---
"@vooya/build-core": patch
"@vooya/compiler": patch
"@vooya/core": patch
"@vooya/react": patch
"@vooya/rspack": patch
"@vooya/solid": patch
"@vooya/svelte": patch
"@vooya/vite": patch
"@vooya/vue": patch
"@vooya/webpack": patch
---

Prepare the first 0.1 beta package set for Rust-file authoring. Keep internal
dependencies aligned with the reviewed beta versions. Vue and React with Vite
remain the supported path; experimental adapters retain their documented limits.
Authors still provide a Rust/WASM toolchain; managed preset installation is
planned separately for 0.2.
