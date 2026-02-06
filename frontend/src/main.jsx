import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet } from "react-router-dom";

// Import your pages
import AUOSmartTicket from "./auo-smart-ticket.jsx";
import OrderBlotter from "./auo-order-blotter.jsx";

// 1. Create a Simple Layout with Navigation
function AppLayout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Navigation Bar */}
      <nav style={{ 
        display: "flex", gap: "20px", padding: "10px 20px", 
        background: "#050810", borderBottom: "1px solid #1a2332", 
        fontSize: "12px", fontFamily: "monospace" 
      }}>
        <div style={{ color: "#00d9ff", fontWeight: "bold", marginRight: "10px" }}>AUO TERMINAL</div>
        <Link to="/home" style={{ color: "#e0e6f0", textDecoration: "none" }}>HOME (TICKET)</Link>
        <Link to="/data" style={{ color: "#e0e6f0", textDecoration: "none" }}>DATA (BLOTTER)</Link>
      </nav>
      
      {/* This renders the specific page (Ticket or Blotter) */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Outlet />
      </div>
    </div>
  );
}

// 2. Configure Routes
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Route for the Order Ticket */}
          <Route path="/home" element={<AUOSmartTicket />} />
          
          {/* Route for the Data Blotter */}
          <Route path="/data" element={<OrderBlotter />} />
        </Route>

        {/* Redirect root to home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

console.log("AUO App running with Routing");