import { useState as e } from "react";
import { jsxs as t } from "react/jsx-runtime";
//#region src/index.tsx
function n() {
	let [n, r] = e(0);
	return /* @__PURE__ */ t("button", {
		onClick: () => r((e) => e + 1),
		children: ["This is a remote React counter: ", n]
	});
}
//#endregion
export { n as default };
