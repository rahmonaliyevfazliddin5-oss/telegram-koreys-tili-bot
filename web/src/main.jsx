import { render } from "preact";
import { App } from "./App.jsx";
import { initRouter } from "./router.js";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/portal.css";

initRouter();

const root = document.getElementById("app");
if (root) {
  render(<App />, root);
}
