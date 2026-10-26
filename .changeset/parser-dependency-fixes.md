---
"@vooya/compiler": patch
"@vooya/provider-rust": patch
---

Require patched CSS selector and TOML parsers to avoid excessive parsing time on large flat selectors and TOML documents. Raise the postcss-selector-parser minimum to 7.1.6 and pin smol-toml to 1.9.1 while preserving the existing CSS and Cargo manifest APIs.
