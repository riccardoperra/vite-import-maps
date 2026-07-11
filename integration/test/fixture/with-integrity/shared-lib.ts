export function foo() {
  return "test";
}

export const bar = "bar";

const sharedLib = {
  foo,
  bar,
};

export default sharedLib;
