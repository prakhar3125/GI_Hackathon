import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

// ─── GLOBAL RESET ───────────────────────────────────────────────
// This removes the browser's default white border and margins
const GlobalStyles = () => (
  <style>{`
    html, body, #root {
      margin: 0 !important;
      padding: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: #050810 !important;
      overflow: hidden !important;
    }
    * { box-sizing: border-box; }
  `}</style>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalStyles />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);