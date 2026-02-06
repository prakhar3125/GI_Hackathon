// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet } from "react-router-dom";

// 1. Import your pages
import Home from "./pages/Home"; // Your existing AUO Ticket component
import OrderBlotter from "./auo-order-blotter"; // The new code you just saved

// 2. Create a Layout Component for Navigation
function Layout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Top Navigation Bar */}
      <nav style={{ 
        display: "flex", alignItems: "center", gap: "20px", padding: "10px 20px", 
        background: "#050810", borderBottom: "1px solid #1a2332", 
        fontSize: "12px", fontFamily: "monospace", flexShrink: 0 
      }}>
        <div style={{ color: "#00d9ff", fontWeight: "bold", marginRight: "10px", fontSize: "14px" }}>
          AUO TERMINAL
        </div>
        
        {/* Navigation Links */}
        <Link to="/home" style={navLinkStyle}>
          TICKET (HOME)
        </Link>
        <Link to="/data" style={navLinkStyle}>
          BLOTTER (DATA)
        </Link>
      </nav>

      {/* Content Area - Renders the child route */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <Outlet />
      </div>
    </div>
  );
}

const navLinkStyle = {
  color: "#e0e6f0", 
  textDecoration: "none", 
  fontWeight: "bold",
  padding: "4px 8px",
  border: "1px solid transparent",
  borderRadius: "4px",
  transition: "all 0.2s"
};

// 3. Define the Routes
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Wrap pages in Layout to show the Nav Bar */}
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/data" element={<OrderBlotter />} />
        </Route>

        {/* Redirect root to /home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        
        {/* 404 Page */}
        <Route path="*" element={<div style={{color: 'white', padding: '20px'}}>404 - Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}