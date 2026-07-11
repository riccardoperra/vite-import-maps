//#region test/fixture/local-entry/shared-lib.ts
function foo() {
	return "local";
}
var localSharedLib = { foo };
//#endregion
export { localSharedLib as default, foo };
