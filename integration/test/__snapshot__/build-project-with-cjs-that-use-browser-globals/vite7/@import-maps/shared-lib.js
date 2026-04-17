const myValue = sessionStorage.get("key");
module.exports.foo = {
  get myValue() {
    return myValue;
  }
};
const cjsNs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
const cjsMod = cjsNs;
const { foo } = cjsNs;
export {
  cjsMod as default,
  foo
};
