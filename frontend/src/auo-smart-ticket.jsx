import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, Clock, TrendingUp, Shield, ChevronDown, ChevronRight,
  Check, Pencil, AlertTriangle, Info, Send, RotateCcw, 
  Activity, Target, Layers, BarChart3, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Gauge, CircleDot, Box,
  Timer, Crosshair, SlidersHorizontal, Cpu
} from "lucide-react";

// ─── API CONFIG ─────────────────────────────────────────────────
// Toggle between mock (null) and real backend:
//   null           → uses built-in mockPrefill (no server needed)
//   "http://localhost:8000" → uses FastAPI backend
const API_BASE = "http://localhost:8000";

// ─── MOCK BACKEND ───────────────────────────────────────────────
const MOCK_CLIENTS = [
  { cpty_id: "Client_XYZ", client_name: "XYZ Capital", urgency_factor: 0.85 },
  { cpty_id: "Client_ABC", client_name: "ABC Asset Management", urgency_factor: 0.50 },
  { cpty_id: "Client_DEF", client_name: "DEF Securities", urgency_factor: 0.30 },
  { cpty_id: "Client_GHI", client_name: "GHI Partners", urgency_factor: 0.70 },
];

const MOCK_SYMBOLS = [
  "RELIANCE.NS", "INFY.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS",
  "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "KOTAKBANK.NS", "LT.NS",
  "HINDUNILVR.NS", "BAJFINANCE.NS", "MARUTI.NS", "ASIANPAINT.NS", "WIPRO.NS"
];

const MOCK_MARKET = {
  "RELIANCE.NS": { ltp: 2570.2, bid: 2570.0, ask: 2570.5, volatility_pct: 2.1, avg_trade_size: 7500, instrument: "RELIANCE INDS T+1" },
  "INFY.NS": { ltp: 1848.6, bid: 1848.0, ask: 1849.0, volatility_pct: 1.4, avg_trade_size: 12000, instrument: "INFOSYS LTD T+1" },
  "TCS.NS": { ltp: 4120.8, bid: 4120.5, ask: 4121.2, volatility_pct: 1.1, avg_trade_size: 5000, instrument: "TCS LTD T+1" },
  "HDFCBANK.NS": { ltp: 1720.4, bid: 1720.0, ask: 1720.8, volatility_pct: 1.8, avg_trade_size: 9000, instrument: "HDFC BANK T+1" },
  "ICICIBANK.NS": { ltp: 1285.6, bid: 1285.2, ask: 1286.0, volatility_pct: 1.6, avg_trade_size: 11000, instrument: "ICICI BANK T+1" },
  "SBIN.NS": { ltp: 812.3, bid: 812.0, ask: 812.6, volatility_pct: 2.4, avg_trade_size: 15000, instrument: "STATE BANK T+1" },
  "BHARTIARTL.NS": { ltp: 1680.5, bid: 1680.2, ask: 1680.8, volatility_pct: 1.3, avg_trade_size: 8000, instrument: "BHARTI AIRTEL T+1" },
  "ITC.NS": { ltp: 465.2, bid: 465.0, ask: 465.4, volatility_pct: 0.9, avg_trade_size: 20000, instrument: "ITC LTD T+1" },
};

function mockPrefill(input) {
  const market = MOCK_MARKET[input.symbol] || MOCK_MARKET["RELIANCE.NS"];
  const client = MOCK_CLIENTS.find(c => c.cpty_id === input.cpty_id) || MOCK_CLIENTS[0];
  const notes = (input.order_notes || "").toLowerCase();

  // Urgency calculation
  const ttc = input.time_to_close ?? 25;
  const timeScore = ttc <= 25 ? 40 : (1 - ttc / 390) * 40;
  const sizeRatio = input.size / market.avg_trade_size;
  const sizeScore = sizeRatio > 20 ? 30 : sizeRatio > 10 ? 25 : sizeRatio > 5 ? 20 : sizeRatio * 3;
  const clientScore = client.urgency_factor * 20;
  const urgentWords = ["urgent", "critical", "immediate", "must complete", "eod compliance", "rush", "asap"];
  const patientWords = ["patient", "no urgency"];
  let notesScore = 0;
  for (const w of urgentWords) { if (notes.includes(w)) { notesScore = 8; break; } }
  for (const w of patientWords) { if (notes.includes(w)) { notesScore = -5; break; } }
  const urgencyScore = Math.round(Math.max(0, Math.min(100, timeScore + sizeScore + clientScore + notesScore)));
  const classification = urgencyScore >= 80 ? "CRITICAL" : urgencyScore >= 60 ? "HIGH" : urgencyScore >= 40 ? "MEDIUM" : "LOW";

  // Side detection
  let side = null, sideConf = "LOW", sideRat = "Require manual selection";
  if (notes.includes("buy") || notes.includes("purchase") || notes.includes("long")) {
    side = "Buy"; sideConf = "HIGH"; sideRat = "Order notes indicate buy instruction";
  } else if (notes.includes("sell") || notes.includes("liquidate") || notes.includes("short")) {
    side = "Sell"; sideConf = "HIGH"; sideRat = "Order notes indicate sell instruction";
  }

  // CAS detection
  const casActive = ttc <= 25;
  const refPrice = market.ltp;
  const upperBand = +(refPrice * 1.03).toFixed(1);
  const lowerBand = +(refPrice * 0.97).toFixed(1);

  // Order type
  let orderType, orderTypeRat;
  if (casActive) {
    orderType = "Limit"; orderTypeRat = "CAS window detected. Limit order required for auction participation within ±3% band.";
  } else if (urgencyScore > 80 && client.urgency_factor > 0.7) {
    orderType = "Market"; orderTypeRat = "High urgency + low price sensitivity → Market order for guaranteed fill";
  } else {
    orderType = "Limit"; orderTypeRat = "Standard limit order for price protection";
  }

  // Limit price
  let limitPrice, limitRat;
  if (casActive) {
    const mult = urgencyScore > 80 ? (side === "Sell" ? 0.992 : 1.008) : (side === "Sell" ? 0.995 : 1.005);
    limitPrice = +(refPrice * mult).toFixed(1);
    limitRat = urgencyScore > 80
      ? `CAS: Aggressive limit at ${side === "Sell" ? "-" : "+"}0.8% for high fill probability (Band: ${lowerBand} - ${upperBand})`
      : `CAS: Moderate limit at ${side === "Sell" ? "-" : "+"}0.5% (Band: ${lowerBand} - ${upperBand})`;
  } else {
    const mid = +((market.bid + market.ask) / 2).toFixed(1);
    if (urgencyScore > 70) { limitPrice = side === "Sell" ? market.bid : market.ask; limitRat = "High urgency: Limit at best price for immediate execution"; }
    else if (urgencyScore > 40) { limitPrice = mid; limitRat = "Medium urgency: Mid-price balances cost and fill probability"; }
    else { limitPrice = side === "Sell" ? +(market.ask - 0.1).toFixed(1) : +(market.bid + 0.1).toFixed(1); limitRat = "Low urgency: Patient limit for better price"; }
  }

  // TIF
  let tif, tifRat;
  if (casActive) { tif = "CAS"; tifRat = "CAS session: Order valid only for closing auction window"; }
  else if (urgencyScore > 90 && notes.includes("immediate")) { tif = "IOC"; tifRat = "Critical urgency: IOC ensures immediate execution attempt"; }
  else { tif = "GFD"; tifRat = "Standard day order: Valid until market close"; }

  // Algo selection
  let useAlgo = false, executor = null, executorRat = "";
  if (casActive) {
    executorRat = "CAS window: Direct limit order to closing auction (no algo needed)";
  } else if (notes.includes("vwap")) {
    useAlgo = true; executor = "VWAP"; executorRat = "Client explicitly requires VWAP benchmark execution";
  } else if (notes.includes("twap")) {
    useAlgo = true; executor = "TWAP"; executorRat = "Client explicitly requires TWAP execution";
  } else if (urgencyScore > 70 && sizeRatio > 3) {
    useAlgo = true; executor = "POV"; executorRat = "High urgency with large order requires aggressive participation (POV)";
  } else if (sizeRatio > 2) {
    useAlgo = true; executor = "VWAP"; executorRat = "Standard VWAP execution balances cost and completion";
  }

  // VWAP params
  const pricing = urgencyScore > 70 ? "Adaptive" : market.volatility_pct > 2.5 ? "Passive" : "Adaptive";
  const pricingRat = urgencyScore > 70 ? "High urgency: Adaptive pricing crosses spread when necessary" : "Standard adaptive pricing balances aggression and patience";
  const urgSetting = urgencyScore > 80 ? "High" : urgencyScore > 50 ? "Auto" : "Low";
  const getDone = urgencyScore > 75 || notes.includes("must complete");
  const openPrint = ttc > 300;
  const closePrint = ttc < 60;
  const closePct = closePrint ? (urgencyScore > 80 ? 30 : 20) : 0;

  // Crossing
  const crossEnabled = sizeRatio > 5;
  const minCross = crossEnabled ? Math.round(input.size * 0.2) : null;
  const maxCross = crossEnabled ? Math.round(input.size * 0.5) : null;

  // IWould
  const iwEnabled = urgencyScore < 40;
  const iwPrice = iwEnabled ? +(market.ltp * (side === "Sell" ? 1.005 : 0.995)).toFixed(1) : null;
  const iwQty = iwEnabled ? Math.round(input.size * 0.3) : null;

  // Limit adjustment
  const limOption = urgencyScore >= 80 ? (side === "Buy" ? "Primary Best Bid" : "Primary Best Ask") : "Order Limit";
  const limOffset = urgencyScore >= 80 ? 1 : 0;

  const today = new Date().toISOString().split("T")[0];

  return new Promise(resolve => {
    setTimeout(() => resolve({
      urgency_score: urgencyScore,
      urgency_classification: classification,
      urgency_breakdown: {
        time_pressure: +timeScore.toFixed(1),
        size_pressure: +sizeScore.toFixed(1),
        client_factor: +clientScore.toFixed(1),
        notes_urgency: notesScore
      },
      prefilled_params: {
        instrument: { value: market.instrument, confidence: "HIGH", rationale: "Auto-populated from symbol" },
        side: { value: side, confidence: sideConf, rationale: sideRat },
        quantity: { value: input.size, confidence: "HIGH", rationale: "Quantity from client mandate" },
        order_type: { value: orderType, confidence: "HIGH", rationale: orderTypeRat },
        price_type: { value: orderType, confidence: "HIGH", rationale: `${orderType} pricing` },
        limit_price: { value: limitPrice, confidence: "HIGH", rationale: limitRat },
        tif: { value: tif, confidence: "HIGH", rationale: tifRat },
        release_date: { value: today, confidence: "HIGH", rationale: "Immediate execution requested" },
        hold: { value: urgencyScore > 70 ? "No" : "No", confidence: "HIGH", rationale: urgencyScore > 70 ? "High urgency - release immediately" : "Standard immediate release" },
        category: { value: "Client", confidence: "HIGH", rationale: "Client order flow" },
        capacity: { value: client.urgency_factor > 0.6 ? "Principal" : "Agent", confidence: "MEDIUM", rationale: client.urgency_factor > 0.6 ? "Standard principal capacity" : "Agency execution model" },
        account: { value: "UNALLOC", confidence: "MEDIUM", rationale: "Standard unallocated block order" },
        service: { value: useAlgo ? "BlueBox 2" : "Market", confidence: "HIGH", rationale: useAlgo ? "Algo engine" : "Direct market execution" },
        executor: { value: executor, confidence: useAlgo ? "HIGH" : "HIGH", rationale: executorRat },
        use_algo: useAlgo,
        // VWAP
        pricing: { value: pricing, confidence: "HIGH", rationale: pricingRat },
        layering: { value: "Auto", confidence: "HIGH", rationale: "Auto-layering optimizes order book placement dynamically" },
        urgency_setting: { value: urgSetting, confidence: "HIGH", rationale: `Urgency score: ${urgencyScore}/100 → ${urgSetting}` },
        get_done: { value: getDone ? "True" : "False", confidence: "HIGH", rationale: getDone ? "Force completion by end time" : "Allow unfilled quantity to remain" },
        opening_print: { value: openPrint ? "True" : "False", confidence: "HIGH", rationale: openPrint ? "Participate in opening auction for early liquidity" : "Order entered after open" },
        opening_pct: { value: openPrint ? 10 : 0, confidence: "MEDIUM", rationale: "Max % in opening auction" },
        closing_print: { value: closePrint ? "True" : "False", confidence: "HIGH", rationale: closePrint ? "Approaching close - participate in closing auction" : "Sufficient time remaining" },
        closing_pct: { value: closePct, confidence: "MEDIUM", rationale: `Max ${closePct}% in closing auction` },
        // Crossing
        min_cross_qty: { value: minCross, confidence: "MEDIUM", rationale: crossEnabled ? "Large order: Enable crossing for 20% blocks" : "Not applicable" },
        max_cross_qty: { value: maxCross, confidence: "MEDIUM", rationale: crossEnabled ? "Large order: Enable crossing for 50% blocks" : "Not applicable" },
        cross_qty_unit: { value: "Shares", confidence: "HIGH", rationale: "Standard unit" },
        leave_active_slice: { value: "False", confidence: "HIGH", rationale: "Avoid over-execution during cross" },
        // IWould
        iwould_price: { value: iwPrice, confidence: "MEDIUM", rationale: iwEnabled ? "Opportunistic execution price" : "Not applicable for urgent orders" },
        iwould_qty: { value: iwQty, confidence: "MEDIUM", rationale: iwEnabled ? "30% of total order" : "Not applicable" },
        // Limit Adjustment
        limit_option: { value: limOption, confidence: urgencyScore >= 80 ? "MEDIUM" : "HIGH", rationale: urgencyScore >= 80 ? "Peg to best price for aggressive fill" : "Static limit price from order" },
        limit_offset: { value: limOffset, confidence: "HIGH", rationale: limOffset ? `${limOffset} tick offset` : "No offset" },
        offset_unit: { value: "Tick", confidence: "HIGH", rationale: "Standard tick-based offset" },
      },
      market_context: {
        time_to_close: ttc,
        market_state: casActive ? "CAS" : ttc <= 60 ? "Pre_Close" : "Continuous",
        cas_active: casActive,
        cas_reference_price: refPrice,
        cas_upper_band: upperBand,
        cas_lower_band: lowerBand,
        ltp: market.ltp, bid: market.bid, ask: market.ask,
        volatility: market.volatility_pct,
        spread_bps: +(((market.ask - market.bid) / market.ltp) * 10000).toFixed(1),
      },
      metadata: {
        auo_version: "1.0.0",
        processing_time_ms: Math.round(Math.random() * 30 + 20),
        confidence_score: +(0.82 + Math.random() * 0.15).toFixed(2),
        timestamp: new Date().toISOString()
      }
    }), 600);
  });
}

// ─── SMART FIELD COMPONENT ──────────────────────────────────────
function SmartField({ label, value, options, hasRun, confidence, rationale, icon, type, disabled: forceDisabled }) {
  const [isEdited, setIsEdited] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [showTip, setShowTip] = useState(false);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!isEdited) setCurrentValue(value);
  }, [value, isEdited]);

  useEffect(() => {
    if (!showTip) return;
    const handler = (e) => { if (tipRef.current && !tipRef.current.contains(e.target)) setShowTip(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTip]);

  const handleChange = (e) => {
    setIsEdited(true);
    setCurrentValue(e.target.value);
  };

  const confColor = confidence === "HIGH" ? "var(--conf-high)" : confidence === "MEDIUM" ? "var(--conf-med)" : "var(--conf-low)";
  const displayVal = currentValue ?? "--";
  const isDisabled = !hasRun || forceDisabled;
  const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
  const IconComp = icon;

  return (
    React.createElement("div", {
      style: {
        display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
        borderRadius: "6px", transition: "all 0.2s",
        background: isEdited ? "rgba(255,170,50,0.06)" : hasRun ? "transparent" : "rgba(255,255,255,0.02)",
        opacity: hasRun ? 1 : 0.4, borderLeft: isEdited ? "2px solid var(--conf-med)" : "2px solid transparent",
        minHeight: "36px"
      }
    },
      IconComp && React.createElement(IconComp, { size: 14, style: { color: "var(--text-dim)", flexShrink: 0 } }),
      React.createElement("span", {
        style: { width: "110px", flexShrink: 0, fontSize: "12px", color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }
      }, label),
      options
        ? React.createElement("select", {
            value: hasRun ? (currentValue || "") : "",
            disabled: isDisabled,
            onChange: handleChange,
            style: {
              flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: "4px", padding: "4px 8px", color: "var(--text-main)", fontSize: "13px",
              fontFamily: "var(--font-mono)", cursor: isDisabled ? "default" : "pointer",
              outline: "none", minWidth: 0
            }
          },
            React.createElement("option", { value: "", disabled: true }, "--"),
            options.map(opt => React.createElement("option", { key: opt, value: opt }, opt))
          )
        : React.createElement("input", {
            type: inputType,
            value: hasRun ? displayVal : "--",
            disabled: isDisabled,
            onChange: handleChange,
            onClick: (e) => hasRun && e.target.select(),
            style: {
              flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: "4px", padding: "4px 8px", color: "var(--text-main)", fontSize: "13px",
              fontFamily: "var(--font-mono)", outline: "none", minWidth: 0
            }
          }),
      hasRun && React.createElement("span", {
        style: { fontSize: "13px", width: "20px", textAlign: "center", flexShrink: 0 }
      }, isEdited
        ? React.createElement(Pencil, { size: 13, style: { color: "var(--conf-med)" } })
        : React.createElement(Check, { size: 13, style: { color: confColor } })
      ),
      hasRun && rationale && React.createElement("div", {
        ref: tipRef,
        style: { position: "relative", flexShrink: 0 }
      },
        React.createElement("button", {
          onClick: () => setShowTip(!showTip),
          style: {
            background: "none", border: "none", cursor: "pointer", padding: "2px",
            color: "var(--text-dim)", display: "flex", alignItems: "center"
          }
        }, React.createElement(Info, { size: 13 })),
        showTip && React.createElement("div", {
          style: {
            position: "absolute", right: 0, top: "100%", marginTop: "4px",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "6px", padding: "8px 12px", fontSize: "11px",
            color: "var(--text-sub)", width: "240px", zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", lineHeight: 1.5,
            fontFamily: "var(--font-body)"
          }
        },
          React.createElement("div", {
            style: { fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: confColor, marginBottom: "4px", fontWeight: 600 }
          }, `${confidence} CONFIDENCE`),
          rationale
        )
      )
    )
  );
}

// ─── SECTION HEADER ─────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, tag }) {
  const IconComp = icon;
  return React.createElement("div", {
    style: {
      display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px",
      borderBottom: "1px solid var(--border)", marginBottom: "4px"
    }
  },
    React.createElement(IconComp, { size: 15, style: { color: "var(--accent)" } }),
    React.createElement("span", { style: { fontSize: "12px", fontWeight: 600, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.06em" } }, title),
    subtitle && React.createElement("span", { style: { fontSize: "11px", color: "var(--text-dim)", marginLeft: "auto" } }, subtitle),
    tag && React.createElement("span", {
      style: {
        fontSize: "9px", padding: "2px 8px", borderRadius: "3px",
        background: tag === "CAS" ? "rgba(255,80,80,0.15)" : "rgba(80,200,120,0.12)",
        color: tag === "CAS" ? "#ff6b6b" : "#50c878", fontWeight: 600, letterSpacing: "0.05em"
      }
    }, tag)
  );
}

// ─── URGENCY GAUGE ──────────────────────────────────────────────
function UrgencyGauge({ score, classification, breakdown }) {
  const color = classification === "CRITICAL" ? "#ff4757" : classification === "HIGH" ? "#ff8c42" : classification === "MEDIUM" ? "#ffd93d" : "#6bdb6b";
  const barWidth = `${score}%`;
  return React.createElement("div", {
    style: { padding: "12px 16px", background: "var(--surface-1)", borderRadius: "8px", border: "1px solid var(--border)" }
  },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
        React.createElement(Gauge, { size: 16, style: { color } }),
        React.createElement("span", { style: { fontSize: "13px", fontWeight: 600, color: "var(--text-main)" } }, "Urgency Score"),
      ),
      React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: "6px" } },
        React.createElement("span", { style: { fontSize: "24px", fontWeight: 700, color, fontFamily: "var(--font-mono)" } }, score),
        React.createElement("span", { style: { fontSize: "11px", color: "var(--text-dim)" } }, "/ 100"),
        React.createElement("span", {
          style: {
            fontSize: "10px", padding: "2px 8px", borderRadius: "3px", marginLeft: "4px",
            background: `${color}22`, color, fontWeight: 700, letterSpacing: "0.05em"
          }
        }, classification)
      )
    ),
    React.createElement("div", {
      style: { height: "4px", background: "var(--surface-2)", borderRadius: "2px", overflow: "hidden", marginBottom: "10px" }
    },
      React.createElement("div", {
        style: { height: "100%", width: barWidth, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: "2px", transition: "width 0.8s ease" }
      })
    ),
    breakdown && React.createElement("div", {
      style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }
    },
      [
        { label: "Time", val: breakdown.time_pressure, max: 40 },
        { label: "Size", val: breakdown.size_pressure, max: 30 },
        { label: "Client", val: breakdown.client_factor, max: 20 },
        { label: "Notes", val: breakdown.notes_urgency, max: 10 },
      ].map(b =>
        React.createElement("div", { key: b.label, style: { textAlign: "center" } },
          React.createElement("div", { style: { fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" } }, b.label),
          React.createElement("div", { style: { fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-sub)" } }, `${b.val}/${b.max}`),
        )
      )
    )
  );
}

// ─── MARKET CONTEXT BAR ─────────────────────────────────────────
function MarketBar({ ctx }) {
  if (!ctx) return null;
  const stateColors = { CAS: "#ff4757", Pre_Close: "#ff8c42", Continuous: "#50c878" };
  const col = stateColors[ctx.market_state] || "#888";
  return React.createElement("div", {
    style: {
      display: "flex", flexWrap: "wrap", gap: "12px", padding: "10px 14px",
      background: "var(--surface-1)", borderRadius: "8px", border: "1px solid var(--border)",
      fontSize: "12px", fontFamily: "var(--font-mono)", alignItems: "center"
    }
  },
    React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "4px" } },
      React.createElement(CircleDot, { size: 10, style: { color: col } }),
      React.createElement("span", { style: { color: col, fontWeight: 700 } }, ctx.market_state)
    ),
    ctx.cas_active && React.createElement("span", {
      style: { padding: "2px 8px", background: "rgba(255,71,87,0.12)", color: "#ff4757", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }
    }, `CAS ACTIVE · ${ctx.time_to_close}min`),
    React.createElement("span", { style: { color: "var(--text-dim)" } }, `LTP ₹${ctx.ltp}`),
    React.createElement("span", { style: { color: "var(--text-dim)" } }, `Bid ₹${ctx.bid}`),
    React.createElement("span", { style: { color: "var(--text-dim)" } }, `Ask ₹${ctx.ask}`),
    React.createElement("span", { style: { color: "var(--text-dim)" } }, `Spread ${ctx.spread_bps}bps`),
    React.createElement("span", { style: { color: "var(--text-dim)" } }, `Vol ${ctx.volatility}%`),
    ctx.cas_active && React.createElement("span", { style: { color: "#ff8c42", fontSize: "11px" } }, `Band: ₹${ctx.cas_lower_band} – ₹${ctx.cas_upper_band}`),
  );
}

// ─── TIME SLIDER ────────────────────────────────────────────────
function TimeSlider({ value, onChange }) {
  const markers = [
    { val: 330, label: "9:30 AM" }, { val: 240, label: "11 AM" },
    { val: 150, label: "1 PM" }, { val: 60, label: "2:30 PM" },
    { val: 25, label: "3:05 PM" }, { val: 10, label: "3:20 PM" },
  ];
  const isCAS = value <= 25;
  return React.createElement("div", { style: { marginBottom: "2px" } },
    React.createElement("div", {
      style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }
    },
      React.createElement("label", { style: { fontSize: "12px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" } },
        React.createElement(Timer, { size: 12, style: { marginRight: "4px", verticalAlign: "middle" } }),
        "Time to Close"
      ),
      React.createElement("span", {
        style: {
          fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 700,
          color: isCAS ? "#ff4757" : value <= 60 ? "#ff8c42" : "var(--text-main)"
        }
      }, `${value} min`, isCAS && " (CAS)")
    ),
    React.createElement("input", {
      type: "range", min: 5, max: 380, value,
      onChange: (e) => onChange(+e.target.value),
      style: { width: "100%", accentColor: isCAS ? "#ff4757" : "var(--accent)" }
    }),
    React.createElement("div", {
      style: { display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-dim)", marginTop: "2px" }
    }, markers.map(m => React.createElement("span", { key: m.val }, m.label)))
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────
export default function AUOSmartTicket() {
  const [symbol, setSymbol] = useState("");
  const [cpty, setCpty] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [ttc, setTtc] = useState(25);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [showSymbols, setShowSymbols] = useState(false);

  const filteredSymbols = MOCK_SYMBOLS.filter(s => s.toLowerCase().includes(symbolSearch.toLowerCase()));
  const debounceRef = useRef(null);

  // Auto-trigger prefill whenever all required fields are filled
  const allFilled = !!(symbol && cpty && qty);

  useEffect(() => {
    if (!allFilled) {
      setResult(null);
      setHasRun(false);
      setLoading(false);
      return;
    }

    // Debounce to avoid hammering on rapid typing (300ms)
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const inputData = { symbol, cpty_id: cpty, size: +qty, order_notes: notes, time_to_close: ttc };

        let res;
        if (API_BASE) {
          // ─── REAL BACKEND (FastAPI) ───
          const resp = await fetch(`${API_BASE}/api/prefill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(inputData),
          });
          if (!resp.ok) throw new Error(`API error ${resp.status}`);
          res = await resp.json();
        } else {
          // ─── MOCK (built-in, no server needed) ───
          res = await mockPrefill(inputData);
        }

        setResult(res);
        setHasRun(true);
      } catch (err) {
        console.error("AUO prefill error:", err);
      }
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [symbol, cpty, qty, notes, ttc, allFilled]);

  const resetAll = () => {
    setResult(null); setHasRun(false); setSymbol(""); setCpty(""); setQty(""); setNotes(""); setTtc(25);
  };

  const p = result?.prefilled_params || {};
  const ctx = result?.market_context;
  const getValue = (v) => v?.value ?? "--";

  return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--text-main)", fontFamily: "var(--font-body)" } },
    React.createElement("style", null, `
      :root {
        --bg: #0c0e14;
        --surface-1: #12151e;
        --surface-2: #1a1e2a;
        --border: #252a38;
        --input-bg: #161a26;
        --text-main: #e2e4ea;
        --text-sub: #b0b4c0;
        --text-dim: #6b7084;
        --accent: #5b8af5;
        --accent-dim: #3d5fa8;
        --conf-high: #50c878;
        --conf-med: #ffa832;
        --conf-low: #ff5555;
        --font-body: 'Segoe UI', system-ui, sans-serif;
        --font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      input, select, textarea, button { font-family: inherit; }
      input:focus, select:focus, textarea:focus { outline: 1px solid var(--accent); border-color: var(--accent) !important; }
      select { appearance: auto; }
      input[type="range"] { height: 4px; }
      ::selection { background: var(--accent); color: white; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: var(--surface-1); }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .loading-pulse { animation: pulse 1.2s ease-in-out infinite; }
    `),

    // HEADER
    React.createElement("div", {
      style: {
        padding: "14px 24px", borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--surface-1)"
      }
    },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
        React.createElement(Zap, { size: 18, style: { color: "var(--accent)" } }),
        React.createElement("span", { style: { fontSize: "15px", fontWeight: 700, letterSpacing: "0.04em" } }, "AUO"),
        React.createElement("span", { style: { fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" } }, "Adaptive Urgency Orchestrator"),
      ),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
        result && React.createElement("span", {
          style: { fontSize: "10px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }
        }, `v${result.metadata.auo_version} · ${result.metadata.processing_time_ms}ms · conf ${result.metadata.confidence_score}`),
        React.createElement("span", {
          style: { fontSize: "10px", padding: "3px 8px", background: "var(--surface-2)", borderRadius: "4px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }
        }, API_BASE ? "⚡ API MODE" : "🧪 MOCK MODE")
      )
    ),

    // TWO COLUMN LAYOUT
    React.createElement("div", {
      style: { display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "calc(100vh - 50px)" }
    },

      // ─── LEFT COLUMN: INPUT ───────────────────────────────
      React.createElement("div", {
        style: { borderRight: "1px solid var(--border)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--surface-1)" }
      },
        React.createElement("div", { style: { fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", fontWeight: 600, marginBottom: "2px" } }, "Order Input"),

        // Symbol
        React.createElement("div", { style: { position: "relative" } },
          React.createElement("label", { style: { fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px", display: "block" } }, "Symbol"),
          React.createElement("input", {
            type: "text", placeholder: "Search symbol...",
            value: symbol || symbolSearch,
            onChange: (e) => { setSymbolSearch(e.target.value); setSymbol(""); setShowSymbols(true); },
            onFocus: () => setShowSymbols(true),
            style: {
              width: "100%", padding: "8px 10px", background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: "6px", color: "var(--text-main)", fontSize: "13px", fontFamily: "var(--font-mono)"
            }
          }),
          showSymbols && symbolSearch && React.createElement("div", {
            style: {
              position: "absolute", top: "100%", left: 0, right: 0, background: "var(--surface-2)",
              border: "1px solid var(--border)", borderRadius: "0 0 6px 6px", maxHeight: "180px",
              overflowY: "auto", zIndex: 50
            }
          },
            filteredSymbols.map(s => React.createElement("div", {
              key: s,
              onClick: () => { setSymbol(s); setSymbolSearch(""); setShowSymbols(false); },
              style: {
                padding: "6px 10px", fontSize: "12px", fontFamily: "var(--font-mono)",
                cursor: "pointer", color: "var(--text-sub)", borderBottom: "1px solid var(--border)"
              },
              onMouseEnter: (e) => { e.target.style.background = "var(--accent)22"; },
              onMouseLeave: (e) => { e.target.style.background = "transparent"; },
            }, s))
          )
        ),

        // Client
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px", display: "block" } }, "Client"),
          React.createElement("select", {
            value: cpty, onChange: (e) => setCpty(e.target.value),
            style: {
              width: "100%", padding: "8px 10px", background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: "6px", color: "var(--text-main)", fontSize: "13px"
            }
          },
            React.createElement("option", { value: "" }, "Select client..."),
            MOCK_CLIENTS.map(c => React.createElement("option", { key: c.cpty_id, value: c.cpty_id }, `${c.cpty_id} — ${c.client_name}`))
          )
        ),

        // Quantity
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px", display: "block" } }, "Quantity"),
          React.createElement("input", {
            type: "number", placeholder: "e.g., 50000", value: qty,
            onChange: (e) => setQty(e.target.value),
            style: {
              width: "100%", padding: "8px 10px", background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: "6px", color: "var(--text-main)", fontSize: "13px", fontFamily: "var(--font-mono)"
            }
          })
        ),

        // Notes
        React.createElement("div", null,
          React.createElement("label", { style: { fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px", display: "block" } }, "Order Notes"),
          React.createElement("textarea", {
            placeholder: "e.g., EOD compliance required - must attain position by close",
            value: notes, onChange: (e) => setNotes(e.target.value), rows: 3,
            style: {
              width: "100%", padding: "8px 10px", background: "var(--input-bg)", border: "1px solid var(--border)",
              borderRadius: "6px", color: "var(--text-main)", fontSize: "12px", resize: "vertical", lineHeight: 1.5
            }
          })
        ),

        // Time Slider
        React.createElement("div", {
          style: { padding: "10px 12px", background: "var(--surface-2)", borderRadius: "8px" }
        }, React.createElement(TimeSlider, { value: ttc, onChange: setTtc })),

        // Live Status Indicator (replaces Run button)
        React.createElement("div", {
          style: {
            width: "100%", padding: "10px 12px", borderRadius: "8px",
            background: loading ? "rgba(91,138,245,0.08)" : hasRun ? "rgba(80,200,120,0.08)" : "var(--surface-2)",
            border: `1px solid ${loading ? "var(--accent)" : hasRun ? "var(--conf-high)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 0.3s ease", fontSize: "12px", fontWeight: 600
          }
        },
          loading
            ? React.createElement(React.Fragment, null,
                React.createElement(Activity, { size: 14, className: "loading-pulse", style: { color: "var(--accent)" } }),
                React.createElement("span", { style: { color: "var(--accent)" } }, "Computing prefill...")
              )
            : hasRun
              ? React.createElement(React.Fragment, null,
                  React.createElement(Check, { size: 14, style: { color: "var(--conf-high)" } }),
                  React.createElement("span", { style: { color: "var(--conf-high)" } }, "Live — updates as you type")
                )
              : React.createElement(React.Fragment, null,
                  React.createElement(CircleDot, { size: 14, style: { color: "var(--text-dim)" } }),
                  React.createElement("span", { style: { color: "var(--text-dim)" } },
                    !symbol ? "Enter symbol..." : !cpty ? "Select client..." : "Enter quantity..."
                  )
                )
        ),

        hasRun && React.createElement("button", {
          onClick: resetAll,
          style: {
            width: "100%", padding: "8px", background: "transparent", border: "1px solid var(--border)",
            borderRadius: "6px", color: "var(--text-dim)", fontSize: "12px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
          }
        }, React.createElement(RotateCcw, { size: 12 }), "Reset All"),

        // Quick presets
        React.createElement("div", {
          style: { marginTop: "auto", padding: "10px 0", borderTop: "1px solid var(--border)" }
        },
          React.createElement("div", { style: { fontSize: "10px", color: "var(--text-dim)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" } }, "Quick Presets"),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "4px" } },
            [
              { label: "Case 1: CAS EOD", sym: "RELIANCE.NS", cl: "Client_XYZ", q: "50000", n: "EOD compliance required - must attain position by close", t: 25 },
              { label: "Case 2: VWAP Morning", sym: "INFY.NS", cl: "Client_ABC", q: "75000", n: "VWAP must complete by 2pm", t: 330 },
              { label: "Case 3: Urgent Large", sym: "HDFCBANK.NS", cl: "Client_GHI", q: "200000", n: "Urgent buy - critical allocation", t: 60 },
            ].map(p => React.createElement("button", {
              key: p.label,
              onClick: () => { setSymbol(p.sym); setCpty(p.cl); setQty(p.q); setNotes(p.n); setTtc(p.t); setSymbolSearch(""); },
              style: {
                padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: "4px", color: "var(--text-sub)", fontSize: "11px", cursor: "pointer",
                textAlign: "left", transition: "all 0.15s"
              },
              onMouseEnter: (e) => { e.target.style.borderColor = "var(--accent)"; },
              onMouseLeave: (e) => { e.target.style.borderColor = "var(--border)"; },
            }, p.label))
          )
        )
      ),

      // ─── RIGHT COLUMN: OUTPUT ─────────────────────────────
      React.createElement("div", {
        style: { padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }
      },

        // Urgency + Market
        hasRun && result && React.createElement(React.Fragment, null,
          React.createElement(UrgencyGauge, {
            score: result.urgency_score,
            classification: result.urgency_classification,
            breakdown: result.urgency_breakdown
          }),
          React.createElement(MarketBar, { ctx: result.market_context }),
        ),

        !hasRun && !loading && React.createElement("div", {
          style: {
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: "var(--text-dim)", gap: "12px"
          }
        },
          React.createElement(SlidersHorizontal, { size: 32, style: { opacity: 0.3 } }),
          React.createElement("span", { style: { fontSize: "13px" } }, "Fill in Symbol, Client & Quantity to auto-generate prefill"),
          React.createElement("span", { style: { fontSize: "11px", fontFamily: "var(--font-mono)" } }, "Parameters update live as you change inputs"),
        ),

        loading && !hasRun && React.createElement("div", {
          style: {
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: "var(--accent)", gap: "12px"
          }
        },
          React.createElement(Activity, { size: 28, className: "loading-pulse" }),
          React.createElement("span", { style: { fontSize: "13px" } }, "Computing intelligent prefill..."),
        ),

        // ─── BLOCK A: Core Execution ───
        React.createElement("div", {
          style: { background: "var(--surface-1)", borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }
        },
          React.createElement(SectionHeader, { icon: Target, title: "Core Execution", subtitle: "Tier 1 & 2", tag: ctx?.cas_active ? "CAS" : null }),
          React.createElement(SmartField, { label: "Instrument", value: getValue(p.instrument), hasRun, confidence: p.instrument?.confidence, rationale: p.instrument?.rationale, icon: Box, disabled: true }),
          React.createElement(SmartField, { label: "Side", value: getValue(p.side), options: ["Buy", "Sell"], hasRun, confidence: p.side?.confidence, rationale: p.side?.rationale, icon: p.side?.value === "Sell" ? ArrowDownRight : ArrowUpRight }),
          React.createElement(SmartField, { label: "Quantity", value: getValue(p.quantity), hasRun, confidence: p.quantity?.confidence, rationale: p.quantity?.rationale, icon: BarChart3, type: "number" }),
          React.createElement(SmartField, { label: "Order Type", value: getValue(p.order_type), options: ["Market", "Limit", "Stop", "Stop_Limit"], hasRun, confidence: p.order_type?.confidence, rationale: p.order_type?.rationale, icon: Layers }),
          React.createElement(SmartField, { label: "Price Type", value: getValue(p.price_type), options: ["Market", "Limit", "Best", "Pegged"], hasRun, confidence: p.price_type?.confidence, rationale: p.price_type?.rationale, icon: TrendingUp }),
          React.createElement(SmartField, { label: "Limit Price", value: getValue(p.limit_price), hasRun, confidence: p.limit_price?.confidence, rationale: p.limit_price?.rationale, icon: Target, type: "number" }),
          React.createElement(SmartField, { label: "TIF", value: getValue(p.tif), options: ["GFD", "GTD", "IOC", "FOK", "CAS"], hasRun, confidence: p.tif?.confidence, rationale: p.tif?.rationale, icon: Clock }),
          React.createElement(SmartField, { label: "Release Date", value: getValue(p.release_date), hasRun, confidence: p.release_date?.confidence, rationale: p.release_date?.rationale, icon: Clock, type: "date" }),
          React.createElement(SmartField, { label: "Hold", value: getValue(p.hold), options: ["Yes", "No"], hasRun, confidence: p.hold?.confidence, rationale: p.hold?.rationale, icon: Shield }),
          React.createElement(SmartField, { label: "Category", value: getValue(p.category), options: ["Client", "House", "Proprietary"], hasRun, confidence: p.category?.confidence, rationale: p.category?.rationale, icon: Shield }),
          React.createElement(SmartField, { label: "Capacity", value: getValue(p.capacity), options: ["Principal", "Agent", "Riskless_Principal"], hasRun, confidence: p.capacity?.confidence, rationale: p.capacity?.rationale, icon: Shield }),
          React.createElement(SmartField, { label: "Account", value: getValue(p.account), hasRun, confidence: p.account?.confidence, rationale: p.account?.rationale, icon: Shield }),
        ),

        // ─── BLOCK B: Algo Strategy ───
        React.createElement("div", {
          style: { background: "var(--surface-1)", borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }
        },
          React.createElement(SectionHeader, { icon: Cpu, title: "Algo Strategy Engine", subtitle: "Tier 3" }),
          React.createElement(SmartField, { label: "Service", value: getValue(p.service), options: ["BlueBox 2", "Market", "DMA"], hasRun, confidence: p.service?.confidence, rationale: p.service?.rationale, icon: Cpu }),
          React.createElement(SmartField, { label: "Executor", value: getValue(p.executor), options: ["VWAP", "TWAP", "POV", "ICEBERG"], hasRun, confidence: p.executor?.confidence, rationale: p.executor?.rationale, icon: Activity }),
          React.createElement(SmartField, { label: "Pricing", value: getValue(p.pricing), options: ["Adaptive", "Passive", "Aggressive"], hasRun, confidence: p.pricing?.confidence, rationale: p.pricing?.rationale, icon: TrendingUp }),
          React.createElement(SmartField, { label: "Layering", value: getValue(p.layering), options: ["Auto", "Manual", "Percentage"], hasRun, confidence: p.layering?.confidence, rationale: p.layering?.rationale, icon: Layers }),
          React.createElement(SmartField, { label: "Urgency", value: getValue(p.urgency_setting), options: ["Low", "Medium", "High", "Auto"], hasRun, confidence: p.urgency_setting?.confidence, rationale: p.urgency_setting?.rationale, icon: Gauge }),
          React.createElement(SmartField, { label: "Get Done?", value: getValue(p.get_done), options: ["True", "False"], hasRun, confidence: p.get_done?.confidence, rationale: p.get_done?.rationale, icon: Check }),
          React.createElement(SmartField, { label: "Open Print?", value: getValue(p.opening_print), options: ["True", "False"], hasRun, confidence: p.opening_print?.confidence, rationale: p.opening_print?.rationale, icon: Eye }),
          React.createElement(SmartField, { label: "Open %", value: getValue(p.opening_pct), hasRun, confidence: p.opening_pct?.confidence, rationale: p.opening_pct?.rationale, icon: Eye, type: "number" }),
          React.createElement(SmartField, { label: "Close Print?", value: getValue(p.closing_print), options: ["True", "False"], hasRun, confidence: p.closing_print?.confidence, rationale: p.closing_print?.rationale, icon: EyeOff }),
          React.createElement(SmartField, { label: "Close %", value: getValue(p.closing_pct), hasRun, confidence: p.closing_pct?.confidence, rationale: p.closing_pct?.rationale, icon: EyeOff, type: "number" }),
        ),

        // ─── BLOCK C: Crossing & Dark Pool ───
        React.createElement("div", {
          style: { background: "var(--surface-1)", borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }
        },
          React.createElement(SectionHeader, { icon: Crosshair, title: "Crossing & Dark Pool" }),
          React.createElement(SmartField, { label: "Min Cross", value: getValue(p.min_cross_qty), hasRun, confidence: p.min_cross_qty?.confidence, rationale: p.min_cross_qty?.rationale, icon: Crosshair, type: "number" }),
          React.createElement(SmartField, { label: "Max Cross", value: getValue(p.max_cross_qty), hasRun, confidence: p.max_cross_qty?.confidence, rationale: p.max_cross_qty?.rationale, icon: Crosshair, type: "number" }),
          React.createElement(SmartField, { label: "Cross Unit", value: getValue(p.cross_qty_unit), options: ["Shares", "Value", "Percentage"], hasRun, confidence: p.cross_qty_unit?.confidence, rationale: p.cross_qty_unit?.rationale, icon: Crosshair }),
          React.createElement(SmartField, { label: "Leave Active", value: getValue(p.leave_active_slice), options: ["True", "False"], hasRun, confidence: p.leave_active_slice?.confidence, rationale: p.leave_active_slice?.rationale, icon: Crosshair }),
        ),

        // ─── BLOCK D: IWould ───
        React.createElement("div", {
          style: { background: "var(--surface-1)", borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }
        },
          React.createElement(SectionHeader, { icon: Zap, title: "Conditional Liquidity (IWould)" }),
          hasRun && result?.urgency_score > 70 && React.createElement("div", {
            style: { padding: "6px 12px", fontSize: "11px", color: "#ff8c42", background: "rgba(255,140,66,0.08)", display: "flex", alignItems: "center", gap: "6px" }
          }, React.createElement(AlertTriangle, { size: 12 }), "High urgency — IWould typically not applicable"),
          React.createElement(SmartField, { label: "IWould Price", value: getValue(p.iwould_price), hasRun, confidence: p.iwould_price?.confidence, rationale: p.iwould_price?.rationale, icon: Target, type: "number" }),
          React.createElement(SmartField, { label: "IWould Qty", value: getValue(p.iwould_qty), hasRun, confidence: p.iwould_qty?.confidence, rationale: p.iwould_qty?.rationale, icon: BarChart3, type: "number" }),
        ),

        // ─── BLOCK E: Dynamic Limits ───
        React.createElement("div", {
          style: { background: "var(--surface-1)", borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }
        },
          React.createElement(SectionHeader, { icon: SlidersHorizontal, title: "Dynamic Limits" }),
          React.createElement(SmartField, { label: "Limit Option", value: getValue(p.limit_option), options: ["Order Limit", "Primary Best Bid", "Primary Best Ask", "VWAP", "Midpoint"], hasRun, confidence: p.limit_option?.confidence, rationale: p.limit_option?.rationale, icon: SlidersHorizontal }),
          React.createElement(SmartField, { label: "Limit Offset", value: getValue(p.limit_offset), hasRun, confidence: p.limit_offset?.confidence, rationale: p.limit_offset?.rationale, icon: SlidersHorizontal, type: "number" }),
          React.createElement(SmartField, { label: "Offset Unit", value: getValue(p.offset_unit), options: ["Tick", "BPS", "Percentage"], hasRun, confidence: p.offset_unit?.confidence, rationale: p.offset_unit?.rationale, icon: SlidersHorizontal }),
        ),

        // ─── ACTION BAR ───
        hasRun && React.createElement("div", {
          style: {
            display: "flex", gap: "10px", padding: "12px 0", borderTop: "1px solid var(--border)",
            position: "sticky", bottom: 0, background: "var(--bg)", paddingBottom: "16px"
          }
        },
          React.createElement("button", {
            style: {
              flex: 1, padding: "12px", background: "var(--accent)", border: "none", borderRadius: "8px",
              color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
            },
            onClick: () => alert("Order submitted! (mock)")
          }, React.createElement(Send, { size: 14 }), "Submit Order"),
          React.createElement("button", {
            style: {
              padding: "12px 20px", background: "transparent", border: "1px solid var(--border)",
              borderRadius: "8px", color: "var(--text-sub)", fontSize: "12px", cursor: "pointer"
            },
            onClick: resetAll
          }, "Cancel"),
        ),
      )
    )
  );
}