import postcss from "postcss";
import parser from "postcss-selector-parser";

import { generatedScopeId } from "./scope.js";
import type { ComponentStyleInput } from "./types.js";

export function compileComponentStyle(component: ComponentStyleInput): string {
  if (!component.style) return "";
  const root = postcss.parse(component.style.content, { from: component.id });
  if (!component.style.scoped) return root.toString();

  const scope = `[data-voo-scope="${generatedScopeId(component)}"]`;
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map((selector) => {
      if (selector.includes(":host")) return scopeHostSelector(selector, scope, component, rule);
      return `${scope} ${selector}`;
    });
  });
  return root.toString();
}

function scopeHostSelector(
  selector: string,
  scope: string,
  component: ComponentStyleInput,
  rule: postcss.Rule,
): string {
  parser((root) => {
    root.walkPseudos((pseudo) => {
      if (pseudo.value !== ":host" && pseudo.value !== ":host-context") return;
      const line = rule.source?.start?.line;
      const location = `${component.id}${line === undefined ? "" : `:${line}`}`;
      const unsupported = new Error(`Unsupported :host selector "${pseudo.toString()}" in ${location}.`);

      if (pseudo.value === ":host-context") {
        const params = pseudo.nodes?.map((node) => node.toString()) ?? [];
        if (params.length !== 1 || !params[0].trim()) throw unsupported;
        selector = selector.replace(pseudo.toString(), `${params[0]} ${scope}`);
        return;
      }
      if (!pseudo.nodes || pseudo.nodes.length === 0) {
        selector = selector.replace(pseudo.toString(), scope);
        return;
      }
      const params = pseudo.nodes.map((node) => node.toString());
      if (params.length !== 1 || !params[0].trim()) throw unsupported;
      selector = selector.replace(pseudo.toString(), `${scope}${params[0]}`);
    });
  }).processSync(selector);
  return selector;
}
