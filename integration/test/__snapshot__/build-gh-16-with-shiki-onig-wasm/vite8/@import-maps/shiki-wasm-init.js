//#region \0vite/wasm-helper.js
var instantiateFromUrl = async (url, opts) => {
	const response = await fetch(url);
	const contentType = response.headers.get("Content-Type") || "";
	if ("instantiateStreaming" in WebAssembly && contentType.startsWith("application/wasm")) return WebAssembly.instantiateStreaming(response, opts);
	else {
		const buffer = await response.arrayBuffer();
		return WebAssembly.instantiate(buffer, opts);
	}
};
var wasm_helper_default = async (opts = {}, url) => {
	let result;
	if (url.startsWith("data:")) {
		const urlContent = url.replace(/^data:.*?base64,/, "");
		let bytes;
		if (typeof Buffer === "function" && typeof Buffer.from === "function") bytes = Buffer.from(urlContent, "base64");
		else if (typeof atob === "function") {
			const binaryString = atob(urlContent);
			bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
		} else throw new Error("Failed to decode base64-encoded data URL, Buffer and atob are not supported");
		result = await WebAssembly.instantiate(bytes, opts);
	} else result = await instantiateFromUrl(url, opts);
	return result.instance;
};
//#endregion
//#region ../node_modules/.pnpm/shiki@4.0.2/node_modules/shiki/dist/onig.wasm?init
var onig_default = (opts) => wasm_helper_default(opts, "/assets/onig-Du5pRr7Y.wasm");
//#endregion
export { onig_default as init };
