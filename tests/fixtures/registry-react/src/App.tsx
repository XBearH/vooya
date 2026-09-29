import { useState } from "react";
import Counter from "./Counter.rs";
import { useCart } from "./Store.rs";

function Island() {
  const { state, add, reset } = useCart();
  const [selected, setSelected] = useState<number | null>(null);
  const count: number = state ?? 0;
  return <section data-testid="island">
    <Counter count={count} onSelected={setSelected} />
    <span>Selected {selected}</span>
    <button disabled={state === undefined} onClick={() => add(1)}>Store {count}</button>
    <button disabled={state === undefined} onClick={() => reset()}>Reset</button>
  </section>;
}

export function App() {
  const [visible, setVisible] = useState(true);
  return <main>
    <button onClick={() => setVisible(!visible)}>{visible ? "Unmount" : "Mount"}</button>
    {visible && <Island />}
  </main>;
}
