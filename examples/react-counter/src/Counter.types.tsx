import Counter from "./Counter.rs";

const valid = <Counter initial={1} onChange={(value) => value.toFixed()} />;

// @ts-expect-error initial is generated as a required number prop.
const invalid = <Counter initial="1" />;

// @ts-expect-error initial is required by the .rs contract.
const missing = <Counter />;

// @ts-expect-error change payload is generated from i32 as number.
const invalidEvent = <Counter initial={1} onChange={(value: string) => value} />;

void valid;
void invalid;
void missing;
void invalidEvent;
