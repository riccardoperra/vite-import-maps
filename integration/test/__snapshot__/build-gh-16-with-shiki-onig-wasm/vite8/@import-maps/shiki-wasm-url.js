//#region ../node_modules/.pnpm/shiki@4.0.2/node_modules/shiki/dist/onig.wasm?url
var onig_default = "/assets/onig-Du5pRr7Y.wasm";
//#endregion
//#region test/fixture/gh-16-with-shiki-onig-wasm/wasm-url.ts
var load = async () => {
	const responsePromise = fetch(onig_default);
	const { module, instance } = await WebAssembly.instantiateStreaming(responsePromise);
};
//#endregion
export { load, onig_default as wasmUrl };
