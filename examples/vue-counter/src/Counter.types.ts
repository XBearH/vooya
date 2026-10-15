import Counter from "./Counter.rs";

type CounterProps = InstanceType<typeof Counter>["$props"];
type CounterEmit = InstanceType<typeof Counter>["$emit"];

const validProps: CounterProps = { initial: 1 };

// @ts-expect-error initial is generated as a required number prop.
const invalidProps: CounterProps = { initial: "1" };

// @ts-expect-error initial is required by the .rs contract.
const missingProps: CounterProps = {};

declare const emit: CounterEmit;
emit("change", 2);

// @ts-expect-error change payload is generated from i32 as number.
emit("change", "2");

void validProps;
void invalidProps;
void missingProps;
