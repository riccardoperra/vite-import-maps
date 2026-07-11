function foo() {
  return "test";
}
const bar = "bar";
const sharedLib = {
  foo,
  bar
};
export {
  bar,
  sharedLib as default,
  foo
};
