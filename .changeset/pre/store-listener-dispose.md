---
"@vooya/core": patch
---

Allow a Store change listener to dispose its own generated Store instance without
holding the generated handle table borrow across synchronous notifications.
