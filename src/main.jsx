import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import EthicsPortal from "./EthicsPortal";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>{/^\/(denunciar\/|equipe-denuncias(?:\/|$))/.test(location.pathname)?<EthicsPortal/>:<App />}</StrictMode>
);
