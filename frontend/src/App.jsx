import React from "react";
import { Routes, Route, Navigate, NavLink, Outlet } from "react-router-dom";

// ─── 1. IMPORTS ──────────────────────────────────────────────────
import AUOSmartTicket from "./auo-smart-ticket.jsx";
import OrderBlotter from "./auo-order-blotter.jsx";
import MarketIntel from "./market-intel.jsx"; 

// ─── 2. STYLING HELPERS ──────────────────────────────────────────
const getLinkStyle = ({ isActive }) => ({
  color: isActive ? "#00d9ff" : "#7a8599",
  textDecoration: "none",
  fontWeight: isActive ? "bold" : "normal",
  padding: "4px 12px",
  fontSize: "11px",
  fontFamily: "monospace",
  borderBottom: isActive ? "2px solid #00d9ff" : "2px solid transparent",
  background: isActive ? "rgba(0, 217, 255, 0.05)" : "transparent",
  transition: "all 0.2s ease"
});

// ─── 3. LAYOUT COMPONENT ────────────────────────────────────────
function AppLayout() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh", 
      width: "100vw",
      background: "#050810" 
    }}>
      {/* Navigation Bar */}
      <nav style={{ 
        display: "flex", 
        alignItems: "center",
        gap: "10px", 
        padding: "0 20px", 
        height: "50px",
        background: "#0a0e1a", 
        borderBottom: "1px solid #1a2332", 
        flexShrink: 0 
      }}>
        <div style={{ 
          color: "#00d9ff", 
          fontWeight: "bold", 
          marginRight: "20px",
          fontSize: "13px",
          fontFamily: "monospace",
          letterSpacing: "0.1em"
        }}>
          AUO TERMINAL
        </div>
        
        <NavLink to="/home" style={getLinkStyle}>TICKET</NavLink>
        <NavLink to="/data" style={getLinkStyle}>BLOTTER</NavLink>
        <NavLink to="/markets" style={getLinkStyle}>MARKETS</NavLink>
        
        <div style={{ marginLeft: "auto", fontSize: "9px", color: "#3a4255", fontFamily: "monospace" }}>
          SYS_READY // V1.0.6
        </div>
      </nav>
      
      {/* Viewport Area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <Outlet />
      </div>
    </div>
  );
}

// ─── 4. ROUTES ──────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/home" element={<AUOSmartTicket />} />
        <Route path="/data" element={<OrderBlotter />} />
        <Route path="/markets" element={<MarketIntel />} />
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<div style={{color: 'red', padding: '20px'}}>404: MODULE_NOT_FOUND</div>} />
    </Routes>
  );
}