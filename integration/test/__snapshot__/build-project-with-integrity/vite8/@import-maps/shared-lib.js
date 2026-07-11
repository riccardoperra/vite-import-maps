//#region test/fixture/with-integrity/shared-lib.ts
function foo() {
	return "test";
}
var bar = "bar";
var sharedLib = {
	foo,
	bar: "bar"
};
//#endregion
export { bar, sharedLib as default, foo };
