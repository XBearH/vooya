import assert from "node:assert/strict";
import test from "node:test";

import { compileComponentStyle } from "../dist/index.js";

const component = {
  id: "/app/Counter.rs",
  name: "Counter",
  style: {
    content: `.counter, button { display: flex; }
:host { color: red; }
@media (width < 500px) { .counter { display: block; } }
@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }`,
    scoped: true,
  },
};

test("prefixes component selectors with a stable host scope", () => {
  const css = compileComponentStyle(component);
  assert.match(css, /\[data-voo-scope="voo-[a-f0-9]+"\] \.counter/);
  assert.match(css, /\[data-voo-scope="voo-[a-f0-9]+"\] button/);
  assert.match(css, /\[data-voo-scope="voo-[a-f0-9]+"\] \{ color: red; \}/);
  assert.match(css, /@media[^}]+\[data-voo-scope=/s);
  assert.match(css, /@keyframes pulse \{ from \{ opacity: 0; \} to \{ opacity: 1; \} \}/);
  assert.doesNotMatch(css, /data-voo-scope[^}]+from/);
});

test("leaves unscoped styles unchanged", () => {
  assert.equal(
    compileComponentStyle({
      ...component,
      style: { content: ".counter { display: flex; }", scoped: false },
    }),
    ".counter { display: flex; }",
  );
});

test("compiles functional :host selectors into valid scoped selectors", () => {
  const css = compileComponentStyle({
    ...component,
    style: {
      content: `:host(.active) > button,
:host-context(.dark) p,
:host:hover { color: red; }`,
      scoped: true,
    },
  });

  assert.match(css, /\[data-voo-scope="voo-[a-f0-9]+"\]\.active > button/);
  assert.match(css, /\.dark \[data-voo-scope="voo-[a-f0-9]+"\] p/);
  assert.match(css, /\[data-voo-scope="voo-[a-f0-9]+"\]:hover \{ color: red; \}/);
});

test("rejects unsupported :host forms with a source-oriented error", () => {
  for (const source of [
    ":host() { color: red; }",
    ":host-context { color: red; }",
    ":host(.a, .b) { color: red; }",
  ]) {
    assert.throws(
      () =>
        compileComponentStyle({
          ...component,
          style: { content: source, scoped: true },
        }),
      (error) =>
        error instanceof Error &&
        /Unsupported :host selector/.test(error.message) &&
        /Counter\.rs/.test(error.message),
    );
  }
});
