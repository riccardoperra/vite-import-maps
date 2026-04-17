const wasmUrl = "/assets/onig-Du5pRr7Y.wasm";
const load = async () => {
  const responsePromise = fetch(wasmUrl);
  const { module, instance } = await WebAssembly.instantiateStreaming(responsePromise);
};
export {
  load,
  wasmUrl
};
