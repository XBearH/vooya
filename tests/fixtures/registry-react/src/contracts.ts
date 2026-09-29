import { useCart } from "./Store.rs";

type Snapshot = ReturnType<typeof useCart>["state"];
const snapshot: Snapshot = 1;
// A generated `any` or `unknown` snapshot would make this directive unused.
// @ts-expect-error Rust u32 snapshots cannot be strings.
const invalidSnapshot: Snapshot = "one";

function checkActions(store: ReturnType<typeof useCart>) {
  store.add(1);
  store.reset();
  // @ts-expect-error Rust u32 actions cannot accept strings.
  store.add("one");
  // @ts-expect-error reset has no arguments.
  store.reset(1);
}

void snapshot;
void invalidSnapshot;
void checkActions;
