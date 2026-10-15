import { useState } from "react";
import { createRoot } from "react-dom/client";
import Counter from "./Counter.rs";

function App() {
  const [initial, setInitial] = useState(2);
  const [event, setEvent] = useState("");
  const [shown, setShown] = useState(true);
  return (
    <main>
      {shown ? <Counter initial={initial} onChange={(value) => setEvent(String(value))} /> : null}
      <button data-host-update onClick={() => setInitial((value) => value + 2)}>Update</button>
      <button data-host-toggle onClick={() => setShown((value) => !value)}>Toggle</button>
      <output data-event>{event}</output>
    </main>
  );
}

createRoot(document.getElementById("app")).render(<App />);
