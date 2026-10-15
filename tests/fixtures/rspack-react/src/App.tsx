import { useState } from "react";
import Counter from "./Counter.rs";
export default function App() { const [value, setValue] = useState(2); const [visible, setVisible] = useState(true); const [emitted, setEmitted] = useState(0); return <><button data-host-update onClick={() => setValue(value + 2)}>Update prop</button><button data-host-toggle onClick={() => setVisible(!visible)}>Toggle island</button>{visible && <Counter initial={value} onChange={setEmitted} />}<output data-event>{emitted}</output></>; }
