import test from "node:test";
import { generateRustComponentModule } from "../dist/index.js";
import { assertBindingsRetry } from "./module-loading-helper.js";

test("Rust component modules retry failures and share pending and successful bindings", async () => {
  const source = generateRustComponentModule({
    component: { version: 1, kind: "component", id: "counter::Counter", name: "Counter", group: "src/Counter.rs", params: [] },
    props: { version: 1, kind: "props", id: "counter::Props", name: "CounterProps", group: "src/Counter.rs", fields: [{ name: "initial", type: "i32" }] },
  });
  await assertBindingsRetry(source, { runtimeSpecifier: "virtual:vooya-runtime",
    exports: ["voo_counter_mount", "voo_counter_dispose", "voo_counter_update_props"] });
});
