---
"@vooya/provider-rust": patch
"@vooya/vite": patch
---

Match Rust macro export names for components and Stores containing acronyms, so names such as `HTTPView` and `HTTPClient` load their WASM bindings correctly. Keep precompiled Vue artifact manifests aligned with those exports.
