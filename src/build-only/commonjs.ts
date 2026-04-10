import { readFile } from "node:fs/promises";
import path from "node:path/posix";
import { createRequire } from "node:module";
import { init, parse } from "cjs-module-lexer";

export function isCommonJsFile(fileName: string): boolean {
  return (
    fileName.endsWith(".cjs") ||
    fileName.endsWith(".cts") ||
    fileName.endsWith(".cjsx") ||
    fileName.endsWith(".ctsx")
  );
}

let cjsInit = false;
export async function collectStaticCommonJsExports(
  fileName: string,
  seen = new Set<string>(),
): Promise<Set<string>> {
  const require = createRequire(import.meta.url);
  if (seen.has(fileName)) {
    return new Set();
  }
  seen.add(fileName);
  const source = await readFile(fileName, "utf8");
  const { exports, reexports } = parse(source);
  const names = new Set(exports);
  for (let specifier of reexports) {
    if (specifier.startsWith(".")) {
      specifier = path.join(path.dirname(fileName), specifier);
    }
    try {
      const resolved = require.resolve(specifier, {
        paths: [fileName],
      });
      const nested = await collectStaticCommonJsExports(resolved, seen);
      for (const name of nested) {
        names.add(name);
      }
    } catch {}
  }

  return names;
}

export async function collectCommonJsNamedExports(fileName: string) {
  if (!cjsInit) {
    await init();
    cjsInit = true;
  }

  const exports = await collectStaticCommonJsExports(fileName);
  return [...exports];
}

export function isVite8CommonJsModule(
  inputFormat: string | undefined,
  fileName: string,
): boolean {
  return (
    inputFormat === "cjs" ||
    (!inputFormat && isCommonJsFile(fileName)) ||
    (inputFormat === "unknown" && isCommonJsFile(fileName))
  );
}

export function buildCommonJsWrapperCode(
  dependencyName: string,
  fileName: string,
  namedExports: Array<string>,
): string {
  let code = [
    `import * as cjsNs from "${dependencyName}";`,
    `const cjsMod = cjsNs.default ?? cjsNs;`,
    `export default cjsMod;`,
  ].join("\n");

  if (namedExports.length > 0) {
    code += `\nexport const { ${namedExports.join(", ")} } = cjsNs;`;
  }

  return code;
}
