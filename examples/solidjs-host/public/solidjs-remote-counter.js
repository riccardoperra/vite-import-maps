import { delegateEvents as o, insert as i, template as l } from "solid-js/web";
import { createSignal as u } from "solid-js";
var a = /* @__PURE__ */ l("<button>This is a remote count: ");
function m() {
  const [e, r] = u(0);
  return (() => {
    var t = a();
    return t.firstChild, t.$$click = () => r((n) => n + 1), i(t, e, null), t;
  })();
}
o(["click"]);
export {
  m as default
};
