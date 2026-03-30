function createGreeting(name: string) {
  return `Hello ${name}`;
}

exports = createGreeting;
exports.foo = createGreeting;
module.exports = createGreeting;
module.exports.foo = createGreeting;
