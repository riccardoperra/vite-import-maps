import wasmUrl from "shiki/onig.wasm?url";

const load = async () => {
  const responsePromise = fetch(wasmUrl);
  const { module, instance } =
    await WebAssembly.instantiateStreaming(responsePromise);
  /* ... */
};

export { wasmUrl, load };
