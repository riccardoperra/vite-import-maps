const initWasm = async (opts = {}, url$3) => {
  let result;
  if (url$3.startsWith("data:")) {
    const urlContent = url$3.replace(/^data:.*?base64,/, "");
    let bytes;
    if (typeof Buffer === "function" && typeof Buffer.from === "function") bytes = Buffer.from(urlContent, "base64");
    else if (typeof atob === "function") {
      const binaryString = atob(urlContent);
      bytes = new Uint8Array(binaryString.length);
      for (let i$1 = 0; i$1 < binaryString.length; i$1++) bytes[i$1] = binaryString.charCodeAt(i$1);
    } else throw new Error("Failed to decode base64-encoded data URL, Buffer and atob are not supported");
    result = await WebAssembly.instantiate(bytes, opts);
  } else {
    const response = await fetch(url$3);
    const contentType = response.headers.get("Content-Type") || "";
    if ("instantiateStreaming" in WebAssembly && contentType.startsWith("application/wasm")) result = await WebAssembly.instantiateStreaming(response, opts);
    else {
      const buffer = await response.arrayBuffer();
      result = await WebAssembly.instantiate(buffer, opts);
    }
  }
  return result.instance;
};
const onig = (opts) => initWasm(opts, "/assets/onig-Du5pRr7Y.wasm?init");
export {
  onig as init
};
