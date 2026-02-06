import React from "react";
import ReactDOM from "react-dom/client";
import AUOSmartTicket from "./auo-smart-ticket.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(AUOSmartTicket)
  )
);

console.log("AUO Smart Ticket running");
