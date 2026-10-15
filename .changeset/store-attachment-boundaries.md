---
"@vooya/vue": patch
"@vooya/solid": patch
"@vooya/svelte": patch
---

Report Store snapshot and subscription failures through `onError`, clear failed bindings, and release owned instances once. Preserve the last good state after a notification snapshot failure so later notifications can recover.
