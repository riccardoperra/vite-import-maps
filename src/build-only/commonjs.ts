import { Visitor } from "vite";
import type { Program } from "oxc-parser";

export function isCommonJsFile(fileName: string): boolean {
  return (
    fileName.endsWith(".cjs") ||
    fileName.endsWith(".cts") ||
    fileName.endsWith(".cjsx") ||
    fileName.endsWith(".ctsx")
  );
}

export function getParseLang(fileName: string): "js" | "jsx" | "ts" | "tsx" {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".ctsx")) {
    return "tsx";
  }

  if (fileName.endsWith(".ts") || fileName.endsWith(".cts")) {
    return "ts";
  }

  if (fileName.endsWith(".jsx") || fileName.endsWith(".cjsx")) {
    return "jsx";
  }

  return "js";
}

export function collectCommonJsNamedExportsFromAst(ast: Program): {
  defaultExport: boolean;
  namedExports: Array<string>;
} {
  const names = new Set<string>();
  let defaultExport = false;

  const visitor = new Visitor({
    AssignmentExpression(node) {
      // exports = identifier
      if (
        node.left.type === "Identifier" &&
        node.left.name === "exports" &&
        node.operator === "=" &&
        node.right.type === "Identifier"
      ) {
        defaultExport = true;
        return;
      }

      if (node.left.type !== "MemberExpression") {
        return;
      }

      // exports.name = identifier;
      if (
        node.left.object.type === "Identifier" &&
        !node.left.computed &&
        node.left.object.name === "exports"
      ) {
        names.add(node.left.property.name);
      }

      // module.exports = identifier
      if (
        node.left.object.type === "Identifier" &&
        !node.left.computed &&
        node.left.object.name === "module" &&
        node.left.property.type === "Identifier" &&
        node.left.property.name === "exports"
      ) {
        defaultExport = true;
        return;
      }

      // module.exports.name = identifier
      if (
        node.left.object.type === "MemberExpression" &&
        !node.left.computed &&
        node.left.object.property.type === "Identifier" &&
        node.left.object.property.name === "module" &&
        node.left.property.type === "Identifier" &&
        node.left.property.name === "exports"
      ) {
        names.add(node.left.property.name);
      }
    },
  });
  visitor.visit(ast);

  return {
    defaultExport,
    namedExports: [...names].filter(
      (name) => name !== "default" && name !== "__esModule",
    ),
  };
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
  { namedExports }: { defaultExport: boolean; namedExports: Array<string> },
): string {
  console.log(namedExports);
  let code = [
    `import * as cjsNs from "${dependencyName}";`,
    `const cjsMod = cjsNs.default ?? cjsNs;`,
    `export default cjsMod;`,
  ].join("\n");

  for (const exportName of namedExports) {
    code += `\nexport const ${exportName} = cjsMod.${exportName};`;
  }

  return code;
}
