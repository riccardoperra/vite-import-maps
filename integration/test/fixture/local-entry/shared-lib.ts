export function foo() {
  return "local";
}

const localSharedLib = { foo };

export default localSharedLib;
