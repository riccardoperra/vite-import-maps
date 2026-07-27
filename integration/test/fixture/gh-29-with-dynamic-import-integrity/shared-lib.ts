export async function loadLazyValue() {
  const { lazyValue } = await import("./lazy.js");
  return lazyValue;
}
