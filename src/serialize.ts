import type { ImportMapSignature } from "./config.js";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | Array<JsonValue>
  | { [key: string]: JsonValue };

function escapeScriptContent(content: string): string {
  return content
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Serialize JSON for an inline script without allowing HTML closing tags. */
export function serializeImportMap(importMap: ImportMapSignature): string {
  return escapeScriptContent(JSON.stringify(importMap));
}

function serializeJavaScriptValue(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeJavaScriptValue).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const properties = Object.entries(value).map(([key, entry]) => {
      const name = JSON.stringify(key);
      return `${key === "__proto__" ? `[${name}]` : name}:${serializeJavaScriptValue(entry)}`;
    });
    return `{${properties.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function importMapJsonToJavaScript(content: string): string {
  return escapeScriptContent(serializeJavaScriptValue(JSON.parse(content)));
}
