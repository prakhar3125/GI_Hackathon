import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Filter, Search, RefreshCw, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Clock, Zap, Eye, X, Download,
  AlertTriangle, Check, Pencil, Activity, CircleDot, FileText,
  TrendingUp, Target, Layers, Cpu, Shield, Box
} from "lucide-react";

const API_BASE = "http://localhost:8000";

// ─── MOCK BLOTTER DATA (when no backend) ────────────────────────
function generateMockOrders() {
  const symbols = ["RELIANCE.NS","INFY.NS","TCS.NS","HDFCBANK.NS","SBIN.NS","ITC.NS","ICICIBANK.NS","BHARTIARTL.NS"];
  const clients = [
    { id: "GS_NY_001", name: "Goldman Sachs AM" },
    { id: "JPM_LON_002", name: "JP Morgan IB" },
    { id: "CITADEL_017", name: "Citadel LLC" },
    { id: "VAN_US_007", name: "Vanguard Group" },
    { id: "CALPERS_021", name: "CalPERS" },
    { id: "BLK_US_006", name: "BlackRock" },
  ];
  const statuses = ["Submitted", "Submitted", "Submitted", "Draft", "Cancelled"];
  const sides = ["Buy", "Sell"];
  const algos = ["VWAP", "TWAP", "POV", null, null];
  const urgClasses = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const tifs = ["GFD", "CAS", "IOC"];
  const states = ["Continuous", "CAS", "Pre_Close"];
  
  const orders = [];
  for (let i = 1; i <= 25; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const cl = clients[Math.floor(Math.random() * clients.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const urg = Math.floor(Math.random() * 100);
    const urgClass = urg >= 80 ? "CRITICAL" : urg >= 60 ? "HIGH" : urg >= 40 ? "MEDIUM" : "LOW";
    const hr = 9 + Math.floor(Math.random() * 6);
    const mn = Math.floor(Math.random() * 60);
    orders.push({
      order_id: i,
      symbol: sym,
      cpty_id: cl.id,
      client_name: cl.name,
      side,
      size: Math.round((5000 + Math.random() * 195000) / 1000) * 1000,
      order_notes: ["EOD compliance required", "VWAP by 2pm", "Urgent buy", "Patient accumulation", "Must liquidate"][Math.floor(Math.random() * 5)],
      arrival_time: `2026-02-06T${String(hr).padStart(2,"0")}:${String(mn).padStart(2,"0")}:00`,
      submission_status: statuses[Math.floor(Math.random() * statuses.length)],
      submitted_at: statuses[0] === "Submitted" ? `2026-02-06T${String(hr).padStart(2,"0")}:${String(mn+1).padStart(2,"0")}:00` : null,
      urgency_score: urg,
      urgency_class: urgClass,
      order_type: urg > 80 ? "Market" : "Limit",
      limit_price: (1000 + Math.random() * 3000).toFixed(1),
      tif: tifs[Math.floor(Math.random() * tifs.length)],
      algo: algos[Math.floor(Math.random() * algos.length)],
      service: Math.random() > 0.5 ? "BlueBox 2" : "Market",
      market_state: states[Math.floor(Math.random() * states.length)],
      ltp_at_entry: (1000 + Math.random() * 3000).toFixed(1),
      confidence: (0.82 + Math.random() * 0.15).toFixed(2),
      override_count: Math.floor(Math.random() * 3),
      trader_overrides: {},
    });
  }
  return orders;
}

function generateMockStats(orders) {
  return {
    total_orders: orders.length,
    submitted: orders.filter(o => o.submission_status === "Submitted").length,
    drafts: orders.filter(o => o.submission_status === "Draft").length,
    cancelled: orders.filter(o => o.submission_status === "Cancelled").length,
    buy_count: orders.filter(o => o.side === "Buy").length,
    sell_count: orders.filter(o => o.side === "Sell").length,
    total_volume: orders.reduce((s, o) => s + o.size, 0),
    unique_symbols: new Set(orders.map(o => o.symbol)).size,
    unique_clients: new Set(orders.map(o => o.cpty_id)).size,
  };
}

// ─── STAT CARD ──────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
                  background: "#0d111a", border: "1px solid #1a2332", borderRadius: "3px", minWidth: "100px" }}>
      {Icon && <Icon size={12} style={{ color: color || "#7a8599" }} />}
      <div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: color || "#e0e6f0", fontFamily: "monospace" }}>{value}</div>
        <div style={{ fontSize: "7px", color: "#7a8599", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      </div>
    </div>
  );
}

// ─── EXPANDED ORDER DETAIL ──────────────────────────────────────
function OrderDetail({ order }) {
  if (!order) return null;
  const rows = [
    ["Order ID", `#${order.order_id}`],
    ["Symbol", order.symbol],
    ["Client", `${order.cpty_id} — ${order.client_name || ""}`],
    ["Side", order.side],
    ["Size", order.size?.toLocaleString()],
    ["Order Type", order.order_type],
    ["Limit Price", order.limit_price ? `₹${order.limit_price}` : "—"],
    ["TIF", order.tif],
    ["Algo", order.algo || "None"],
    ["Service", order.service],
    ["Urgency", `${order.urgency_score}/100 (${order.urgency_class})`],
    ["Market State", order.market_state],
    ["LTP at Entry", order.ltp_at_entry ? `₹${order.ltp_at_entry}` : "—"],
    ["Confidence", order.confidence],
    ["Arrival", order.arrival_time],
    ["Submitted", order.submitted_at || "—"],
    ["Status", order.submission_status],
    ["Overrides", order.override_count || 0],
    ["Notes", order.order_notes || "—"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", padding: "8px 12px",
                  background: "#0a0e1a", borderTop: "1px solid #1a2332", fontSize: "9px" }}>
      {rows.map(([label, val]) => (
        <div key={label} style={{ padding: "3px 0", display: "flex", gap: "6px" }}>
          <span style={{ color: "#7a8599", minWidth: "80px" }}>{label}:</span>
          <span style={{ color: "#e0e6f0", fontFamily: "monospace", wordBreak: "break-all" }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN BLOTTER COMPONENT ─────────────────────────────────────
export default function OrderBlotter() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [fSymbol, setFSymbol] = useState("");
  const [fClient, setFClient] = useState("");
  const [fSide, setFSide] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState("order_id");
  const [sortDir, setSortDir] = useState("desc");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (API_BASE) {
        const params = new URLSearchParams();
        if (fSymbol) params.set("symbol", fSymbol);
        if (fClient) params.set("cpty_id", fClient);
        if (fSide) params.set("side", fSide);
        if (fStatus) params.set("status", fStatus);
        if (fDateFrom) params.set("date_from", fDateFrom);
        if (fDateTo) params.set("date_to", fDateTo);
        params.set("limit", "200");

        const resp = await fetch(`${API_BASE}/api/orders?${params}`);
        if (!resp.ok) throw new Error(`API ${resp.status}`);
        const data = await resp.json();
        setOrders(data.orders || []);
        setTotal(data.total || 0);

        const statsResp = await fetch(`${API_BASE}/api/orders/stats`);
        if (statsResp.ok) setStats(await statsResp.json());
      } else {
        // Mock
        const mock = generateMockOrders();
        setOrders(mock);
        setTotal(mock.length);
        setStats(generateMockStats(mock));
      }
    } catch (err) {
      console.error("Blotter fetch error:", err);
      // Fallback to mock
      const mock = generateMockOrders();
      setOrders(mock);
      setTotal(mock.length);
      setStats(generateMockStats(mock));
    }
    setLoading(false);
  }, [fSymbol, fClient, fSide, fStatus, fDateFrom, fDateTo]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const clearFilters = () => {
    setFSymbol(""); setFClient(""); setFSide(""); setFStatus(""); setFDateFrom(""); setFDateTo("");
  };

  const activeFilterCount = [fSymbol, fClient, fSide, fStatus, fDateFrom, fDateTo].filter(Boolean).length;

  // Client-side sort
  const sorted = [...orders].sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return null;
    return sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  const urgColor = (cls) => cls === "CRITICAL" ? "#ff4444" : cls === "HIGH" ? "#ff8800" : cls === "MEDIUM" ? "#ffaa00" : "#00d966";
  const statusColor = (s) => s === "Submitted" ? "#00d966" : s === "Draft" ? "#ffaa00" : "#ff4444";

  const inputStyle = {
    padding: "4px 6px", background: "#050810", border: "1px solid #1a2332",
    borderRadius: "2px", color: "#e0e6f0", fontSize: "10px", fontFamily: "monospace", width: "100%"
  };

  const columns = [
    { key: "order_id", label: "ID", w: "50px" },
    { key: "symbol", label: "SYMBOL", w: "100px" },
    { key: "client_name", label: "CLIENT", w: "140px" },
    { key: "side", label: "SIDE", w: "50px" },
    { key: "size", label: "SIZE", w: "80px" },
    { key: "urgency_score", label: "URG", w: "65px" },
    { key: "order_type", label: "TYPE", w: "60px" },
    { key: "limit_price", label: "LIMIT ₹", w: "80px" },
    { key: "tif", label: "TIF", w: "45px" },
    { key: "algo", label: "ALGO", w: "60px" },
    { key: "market_state", label: "MKT", w: "70px" },
    { key: "submission_status", label: "STATUS", w: "75px" },
    { key: "arrival_time", label: "TIME", w: "70px" },
    { key: "override_count", label: "OVR", w: "35px" },
  ];

  return (
    <div style={{ width: "100%", height: "100%", background: "#050810", color: "#e0e6f0", fontFamily: "monospace", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: monospace; }
        input:focus, select:focus { outline: 1px solid #00d9ff; border-color: #00d9ff !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 3px; }
        ::selection { background: #00d9ff; color: #000; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulse { animation: pulse 1.2s ease-in-out infinite; }
        .blotter-row:hover { background: rgba(0,217,255,0.04) !important; }
        .th-btn { cursor: pointer; background: none; border: none; color: #7a8599; display: flex; align-items: center; gap: 3px; font-size: 8px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; padding: 0; }
        .th-btn:hover { color: #00d9ff; }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px",
                    background: "#0a0e1a", borderBottom: "1px solid #1a2332", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={14} style={{ color: "#00d9ff" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>ORDER BLOTTER</span>
          <span style={{ fontSize: "8px", color: "#7a8599" }}>AUO EXECUTION HISTORY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "9px", color: "#7a8599" }}>{total} orders</span>
          <button onClick={fetchOrders} title="Refresh"
            style={{ background: "none", border: "1px solid #1a2332", borderRadius: "2px", padding: "3px 6px",
                     cursor: "pointer", color: "#7a8599", display: "flex", alignItems: "center", gap: "4px", fontSize: "9px" }}>
            <RefreshCw size={10} className={loading ? "pulse" : ""} /> REFRESH
          </button>
          <span style={{ padding: "2px 6px", background: "#0d111a", borderRadius: "2px", fontSize: "8px", color: "#7a8599" }}>
            {API_BASE ? "⚡ API" : "🧪 MOCK"}
          </span>
        </div>
      </div>

      {/* ─── STATS BAR ─── */}
      {stats && (
        <div style={{ display: "flex", gap: "6px", padding: "6px 12px", background: "#0a0e1a",
                      borderBottom: "1px solid #1a2332", flexShrink: 0, overflowX: "auto" }}>
          <StatCard label="Total" value={stats.total_orders} icon={BarChart3} />
          <StatCard label="Submitted" value={stats.submitted} color="#00d966" icon={Check} />
          <StatCard label="Drafts" value={stats.drafts} color="#ffaa00" icon={Pencil} />
          <StatCard label="Cancelled" value={stats.cancelled} color="#ff4444" icon={X} />
          <StatCard label="Buys" value={stats.buy_count} color="#00d9ff" icon={ArrowUpRight} />
          <StatCard label="Sells" value={stats.sell_count} color="#ff8800" icon={ArrowDownRight} />
          <StatCard label="Volume" value={stats.total_volume?.toLocaleString()} icon={Activity} />
          <StatCard label="Symbols" value={stats.unique_symbols} icon={Box} />
          <StatCard label="Clients" value={stats.unique_clients} icon={Shield} />
        </div>
      )}

      {/* ─── FILTER BAR ─── */}
      <div style={{ padding: "6px 12px", background: "#0a0e1a", borderBottom: "1px solid #1a2332", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setShowFilters(!showFilters)}
            style={{ background: "none", border: "1px solid #1a2332", borderRadius: "2px", padding: "3px 8px",
                     cursor: "pointer", color: activeFilterCount > 0 ? "#00d9ff" : "#7a8599",
                     display: "flex", alignItems: "center", gap: "4px", fontSize: "9px" }}>
            <Filter size={10} /> FILTERS
            {activeFilterCount > 0 && (
              <span style={{ padding: "1px 5px", background: "rgba(0,217,255,0.2)", borderRadius: "2px", fontSize: "8px", color: "#00d9ff" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#ff4444", fontSize: "8px",
                       display: "flex", alignItems: "center", gap: "3px" }}>
              <X size={9} /> CLEAR ALL
            </button>
          )}
          {/* Quick filter pills */}
          {[fSymbol && `Symbol: ${fSymbol}`, fClient && `Client: ${fClient}`, fSide && `Side: ${fSide}`,
            fStatus && `Status: ${fStatus}`, fDateFrom && `From: ${fDateFrom}`, fDateTo && `To: ${fDateTo}`]
            .filter(Boolean).map(pill => (
            <span key={pill} style={{ padding: "2px 6px", background: "rgba(0,217,255,0.1)", borderRadius: "2px",
                                       fontSize: "8px", color: "#00d9ff" }}>
              {pill}
            </span>
          ))}
        </div>

        {showFilters && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", marginTop: "8px", paddingBottom: "4px" }}>
            <div>
              <label style={{ fontSize: "7px", color: "#7a8599", display: "block", marginBottom: "2px" }}>SYMBOL</label>
              <input type="text" placeholder="RELIANCE.NS" value={fSymbol} onChange={e => setFSymbol(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "7px", color: "#7a8599", display: "block", marginBottom: "2px" }}>CLIENT ID</label>
              <input type="text" placeholder="GS_NY_001" value={fClient} onChange={e => setFClient(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "7px", color: "#7a8599", display: "block", marginBottom: "2px" }}>SIDE</label>
              <select value={fSide} onChange={e => setFSide(e.target.value)} style={inputStyle}>
                <option value="">All</option>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "7px", color: "#7a8599", display: "block", marginBottom: "2px" }}>STATUS</label>
              <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={inputStyle}>
                <option value="">All</option>
                <option value="Submitted">Submitted</option>
                <option value="Draft">Draft</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "7px", color: "#7a8599", display: "block", marginBottom: "2px" }}>DATE FROM</label>
              <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "7px", color: "#7a8599", display: "block", marginBottom: "2px" }}>DATE TO</label>
              <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      {/* ─── TABLE ─── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
        {/* Table header */}
        <div style={{ display: "flex", alignItems: "center", padding: "4px 12px", background: "#0d111a",
                      borderBottom: "1px solid #1a2332", position: "sticky", top: 0, zIndex: 10 }}>
          {columns.map(col => (
            <div key={col.key} style={{ width: col.w, flexShrink: 0, padding: "0 4px" }}>
              <button className="th-btn" onClick={() => handleSort(col.key)}>
                {col.label} <SortIcon col={col.key} />
              </button>
            </div>
          ))}
          <div style={{ width: "30px", flexShrink: 0 }} />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: "20px", textAlign: "center", color: "#00d9ff", fontSize: "10px" }}>
            <Activity size={16} className="pulse" style={{ marginRight: "6px" }} />
            Loading orders...
          </div>
        )}

        {/* Empty */}
        {!loading && sorted.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#7a8599", fontSize: "11px" }}>
            <FileText size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
            <div>No orders found</div>
            {activeFilterCount > 0 && <div style={{ fontSize: "9px", marginTop: "4px" }}>Try adjusting your filters</div>}
          </div>
        )}

        {/* Rows */}
        {!loading && sorted.map(order => (
          <React.Fragment key={order.order_id}>
            <div className="blotter-row"
              onClick={() => setExpandedId(expandedId === order.order_id ? null : order.order_id)}
              style={{ display: "flex", alignItems: "center", padding: "4px 12px", cursor: "pointer",
                       borderBottom: "1px solid #0d111a", fontSize: "10px", fontFamily: "monospace",
                       background: expandedId === order.order_id ? "rgba(0,217,255,0.04)" : "transparent",
                       transition: "background 0.15s" }}>
              
              {/* ID */}
              <div style={{ width: columns[0].w, flexShrink: 0, padding: "0 4px", color: "#7a8599" }}>
                #{order.order_id}
              </div>
              
              {/* Symbol */}
              <div style={{ width: columns[1].w, flexShrink: 0, padding: "0 4px", color: "#e0e6f0", fontWeight: 600 }}>
                {order.symbol?.replace(".NS", "")}
              </div>
              
              {/* Client */}
              <div style={{ width: columns[2].w, flexShrink: 0, padding: "0 4px", color: "#b0b8c8", fontSize: "9px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {order.client_name || order.cpty_id}
              </div>
              
              {/* Side */}
              <div style={{ width: columns[3].w, flexShrink: 0, padding: "0 4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px",
                               color: order.side === "Buy" ? "#00d9ff" : "#ff8800", fontWeight: 700 }}>
                  {order.side === "Buy" ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                  {order.side || "—"}
                </span>
              </div>
              
              {/* Size */}
              <div style={{ width: columns[4].w, flexShrink: 0, padding: "0 4px", color: "#e0e6f0", textAlign: "right" }}>
                {order.size?.toLocaleString()}
              </div>
              
              {/* Urgency */}
              <div style={{ width: columns[5].w, flexShrink: 0, padding: "0 4px" }}>
                {order.urgency_score != null ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: urgColor(order.urgency_class) }}>
                      {order.urgency_score}
                    </span>
                    <span style={{ padding: "1px 4px", background: `${urgColor(order.urgency_class)}22`,
                                   color: urgColor(order.urgency_class), borderRadius: "2px", fontSize: "7px", fontWeight: 700 }}>
                      {order.urgency_class?.charAt(0)}
                    </span>
                  </span>
                ) : <span style={{ color: "#7a8599" }}>—</span>}
              </div>
              
              {/* Order Type */}
              <div style={{ width: columns[6].w, flexShrink: 0, padding: "0 4px", color: "#b0b8c8" }}>
                {order.order_type || "—"}
              </div>
              
              {/* Limit Price */}
              <div style={{ width: columns[7].w, flexShrink: 0, padding: "0 4px", color: "#e0e6f0", textAlign: "right" }}>
                {order.limit_price ? `₹${Number(order.limit_price).toFixed(1)}` : "—"}
              </div>
              
              {/* TIF */}
              <div style={{ width: columns[8].w, flexShrink: 0, padding: "0 4px", color: order.tif === "CAS" ? "#ff4444" : "#b0b8c8" }}>
                {order.tif || "—"}
              </div>
              
              {/* Algo */}
              <div style={{ width: columns[9].w, flexShrink: 0, padding: "0 4px" }}>
                {order.algo && order.algo !== "null" ? (
                  <span style={{ padding: "1px 5px", background: "rgba(0,217,255,0.1)", color: "#00d9ff",
                                 borderRadius: "2px", fontSize: "8px" }}>
                    {order.algo}
                  </span>
                ) : <span style={{ color: "#7a8599" }}>—</span>}
              </div>
              
              {/* Market State */}
              <div style={{ width: columns[10].w, flexShrink: 0, padding: "0 4px" }}>
                <span style={{ color: order.market_state === "CAS" ? "#ff4444" : order.market_state === "Pre_Close" ? "#ff8800" : "#00d966", fontSize: "9px" }}>
                  {order.market_state || "—"}
                </span>
              </div>
              
              {/* Status */}
              <div style={{ width: columns[11].w, flexShrink: 0, padding: "0 4px" }}>
                <span style={{ padding: "1px 5px", background: `${statusColor(order.submission_status)}18`,
                               color: statusColor(order.submission_status), borderRadius: "2px", fontSize: "8px", fontWeight: 600 }}>
                  {order.submission_status}
                </span>
              </div>
              
              {/* Time */}
              <div style={{ width: columns[12].w, flexShrink: 0, padding: "0 4px", color: "#7a8599", fontSize: "9px" }}>
                {order.arrival_time ? order.arrival_time.split("T")[1]?.substring(0, 5) : "—"}
              </div>
              
              {/* Override */}
              <div style={{ width: columns[13].w, flexShrink: 0, padding: "0 4px" }}>
                {order.override_count > 0 ? (
                  <span style={{ color: "#ffaa00", display: "flex", alignItems: "center", gap: "2px" }}>
                    <Pencil size={8} /> {order.override_count}
                  </span>
                ) : null}
              </div>
              
              {/* Expand chevron */}
              <div style={{ width: "30px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
                {expandedId === order.order_id ? <ChevronUp size={10} color="#00d9ff" /> : <ChevronDown size={10} color="#7a8599" />}
              </div>
            </div>
            
            {/* Expanded detail */}
            {expandedId === order.order_id && <OrderDetail order={order} />}
          </React.Fragment>
        ))}
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{ padding: "4px 12px", background: "#0a0e1a", borderTop: "1px solid #1a2332",
                    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8px",
                    color: "#7a8599", flexShrink: 0 }}>
        <span>Showing {sorted.length} of {total} orders</span>
        <span>{API_BASE ? `Connected: ${API_BASE}` : "Mock data"} · {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}