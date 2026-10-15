---
"@vooya/react": patch
---

Report Store subscription failures through the current onError callback and
release failed instances once. Catch late initialization/disposal failures
after unmount without invoking inactive owner callbacks, and keep StrictMode
instances isolated.
