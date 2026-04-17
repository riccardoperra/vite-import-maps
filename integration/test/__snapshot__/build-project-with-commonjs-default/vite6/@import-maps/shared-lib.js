var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var require_shared_lib = __commonJS({
  "@import-maps/shared-lib.js"(exports, module) {
    function createGreeting(name) {
      return `Hello ${name}`;
    }
    exports = createGreeting;
    exports.foo = createGreeting;
    module.exports = createGreeting;
    module.exports.foo = createGreeting;
  }
});
export default require_shared_lib();
