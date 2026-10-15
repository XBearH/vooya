import VooyaGrid from "./VooyaGrid.rs";

type GridProps = InstanceType<typeof VooyaGrid>["$props"];

const defaultRows: GridProps = {};
const explicitRows: GridProps = { rows: 10_000 };

// @ts-expect-error usize is generated as a number prop.
const invalidRows: GridProps = { rows: "10000" };

void defaultRows;
void explicitRows;
void invalidRows;
