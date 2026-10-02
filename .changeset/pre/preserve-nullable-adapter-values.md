---
"@vooya/react": patch
"@vooya/vue": patch
---

Preserve nullable values at the framework boundary. React now distinguishes a
ready Store snapshot containing null from an unloaded Store. Vue preserves an
omitted optional Boolean prop as undefined so Rust receives None rather than
Some(false), while retaining explicit Boolean values and declared defaults.
