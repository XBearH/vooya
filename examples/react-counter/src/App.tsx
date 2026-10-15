import { useState } from "react";
import Counter from "./Counter.rs";
import FailMount from "./FailMount.rs";
import LoopEvents from "./LoopEvents.rs";
import ProtocolEvents from "./ProtocolEvents.rs";

export function App() {
  const [initial, setInitial] = useState(1);
  const [lastChange, setLastChange] = useState<number>();
  const [selected, setSelected] = useState<number>();
  const [visible, setVisible] = useState(true);
  const [protocolVisible, setProtocolVisible] = useState(true);
  const [protocol, setProtocol] = useState<string>();
  const [mountError, setMountError] = useState<string>();
  const [failedPing, setFailedPing] = useState(false);
  const [failedVisible, setFailedVisible] = useState(false);

  return (
    <main>
      <h1>Vooya inside React</h1>
      {visible && (
        <Counter
          initial={initial}
          className="counter-host"
          onChange={(value) => setLastChange(value)}
        />
      )}
      <p>React received: {lastChange ?? "no event"}</p>
      <button onClick={() => setInitial(10)}>Set React prop to 10</button>
      <button onClick={() => setInitial(11)}>Set React prop to 11</button>
      <button onClick={() => setVisible((current) => !current)}>Toggle Vooya island</button>
      <LoopEvents onChoose={(index) => setSelected(index)} />
      <p>React loop event: {selected ?? "no event"}</p>
      {protocolVisible && (
        <ProtocolEvents
          className="protocol-host"
          onZero={() => setProtocol("zero")}
          onOne={(value) => setProtocol(`one:${value}`)}
          onMany={(index, enabled, label) => setProtocol(`many:${index}:${enabled}:${label}`)}
        />
      )}
      <p>React protocol event: {protocol ?? "no event"}</p>
      <button onClick={() => setProtocolVisible((current) => !current)}>Toggle protocol island</button>
      <button onClick={() => setFailedVisible(true)}>Mount failing island</button>
      {failedVisible && <FailMount className="failed-host" onError={(error) => setMountError(error.stage)} onPing={() => setFailedPing(true)} />}
      <p>React failed mount: {mountError ?? "no error"}</p>
      <p>React failed mount ping: {failedPing ? "received" : "none"}</p>
    </main>
  );
}
