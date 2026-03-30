import { createRequire } from "node:module";
import { resolve } from "mlly";

export function isCommonJsFile(fileName: string): boolean {
  return (
    fileName.endsWith(".cjs") ||
    fileName.endsWith(".cts") ||
    fileName.endsWith(".cjsx") ||
    fileName.endsWith(".ctsx")
  );
}

export async function collectCommonJsNamedExports(fileName: string) {
  const url = await resolve(fileName, {
    conditions: ["browser", "require", "import", "require", "default"],
    url: import.meta.url,
  });
  const require = createRequire(import.meta.url);
  const mod = await require(url.replace("file://", ""));
  return Object.keys(mod);
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
