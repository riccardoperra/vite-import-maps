function foo() {
  return "local";
}
const localSharedLib = { foo };
export {
  localSharedLib as default,
  foo
};
