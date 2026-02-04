import { jsxs as n } from "react/jsx-runtime";
import { useState as r } from "react";
function c() {
  const [t, o] = r(0);
  return /* @__PURE__ */ n("button", { onClick: () => o((e) => e + 1), children: [
    "This is a remote React counter: ",
    t
  ] });
}
export {
  c as default
};
