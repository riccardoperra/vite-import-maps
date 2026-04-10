const myValue = sessionStorage.get("key");

module.exports.foo = {
  get myValue() {
    return myValue;
  },
};
