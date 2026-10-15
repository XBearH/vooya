/** Stable component scope shared by generated modules and scoped CSS. */
export function generatedScopeId(component: { id?: string; name: string }): string {
  const source = component.id ?? component.name;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `voo-${(hash >>> 0).toString(16)}`;
}
