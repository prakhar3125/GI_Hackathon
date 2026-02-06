import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Zap, Clock, TrendingUp, Shield, ChevronDown, ChevronRight,
  Check, Pencil, AlertTriangle, Info, Send, RotateCcw, 
  Activity, Target, Layers, BarChart3, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Gauge, CircleDot, Box,
  Timer, Crosshair, SlidersHorizontal, Cpu, RefreshCw
} from "lucide-react";

// ─── API CONFIG ─────────────────────────────────────────────────
const API_BASE = "http://localhost:8000"; // Toggle: null for mock, "http://localhost:8000" for real

const MOCK_CLIENTS = [
  // Tier 1 - High Frequency / Urgent Clients
  { cpty_id: "GS_NY_001", client_name: "Goldman Sachs Asset Management", urgency_factor: 0.95 },
  { cpty_id: "JPM_LON_002", client_name: "JP Morgan Investment Bank", urgency_factor: 0.92 },
  { cpty_id: "MS_NYC_003", client_name: "Morgan Stanley Wealth Management", urgency_factor: 0.88 },
  { cpty_id: "CITI_SG_004", client_name: "Citigroup Global Markets", urgency_factor: 0.90 },
  { cpty_id: "BARC_UK_005", client_name: "Barclays Capital", urgency_factor: 0.87 },

  // Tier 2 - Active Institutional Clients
  { cpty_id: "BLK_US_006", client_name: "BlackRock Institutional", urgency_factor: 0.82 },
  { cpty_id: "VAN_US_007", client_name: "Vanguard Group", urgency_factor: 0.65 },
  { cpty_id: "STT_BOS_008", client_name: "State Street Global Advisors", urgency_factor: 0.78 },
  { cpty_id: "FID_US_009", client_name: "Fidelity Investments", urgency_factor: 0.75 },
  { cpty_id: "PIMCO_010", client_name: "PIMCO Fixed Income", urgency_factor: 0.68 },
  { cpty_id: "INVESCO_011", client_name: "Invesco Asset Management", urgency_factor: 0.72 },
  { cpty_id: "TCAP_012", client_name: "T. Rowe Price", urgency_factor: 0.70 },
  { cpty_id: "FRANK_013", client_name: "Franklin Templeton", urgency_factor: 0.67 },

  // Tier 3 - Hedge Funds
  { cpty_id: "BWATER_014", client_name: "Bridgewater Associates", urgency_factor: 0.85 },
  { cpty_id: "AQR_015", client_name: "AQR Capital Management", urgency_factor: 0.80 },
  { cpty_id: "RENTECH_016", client_name: "Renaissance Technologies", urgency_factor: 0.93 },
  { cpty_id: "CITADEL_017", client_name: "Citadel LLC", urgency_factor: 0.91 },
  { cpty_id: "2SIGMA_018", client_name: "Two Sigma Investments", urgency_factor: 0.89 },
  { cpty_id: "DESHAW_019", client_name: "D.E. Shaw Group", urgency_factor: 0.86 },
  { cpty_id: "MILLEN_020", client_name: "Millennium Management", urgency_factor: 0.84 },

  // Tier 4 - Pension Funds & Insurance
  { cpty_id: "CALPERS_021", client_name: "CalPERS", urgency_factor: 0.45 },
  { cpty_id: "NYPENS_022", client_name: "NY State Pension Fund", urgency_factor: 0.48 },
  { cpty_id: "ONTPEN_023", client_name: "Ontario Teachers Pension", urgency_factor: 0.50 },
  { cpty_id: "NORGES_024", client_name: "Norges Bank Investment", urgency_factor: 0.42 },
  { cpty_id: "METLIFE_025", client_name: "MetLife Investment", urgency_factor: 0.55 },
  { cpty_id: "PRUDEN_026", client_name: "Prudential Financial", urgency_factor: 0.52 },

  // Tier 5 - Sovereign Wealth & Endowments
  { cpty_id: "ADIA_027", client_name: "Abu Dhabi Investment Authority", urgency_factor: 0.38 },
  { cpty_id: "GIC_SG_028", client_name: "GIC Private Limited", urgency_factor: 0.40 },
  { cpty_id: "SAFE_CN_029", client_name: "SAFE China", urgency_factor: 0.35 },
  { cpty_id: "HARV_END_030", client_name: "Harvard Management Co", urgency_factor: 0.43 },
  { cpty_id: "YALE_END_031", client_name: "Yale Investments", urgency_factor: 0.46 },

  // Tier 6 - Boutique / Regional
  { cpty_id: "WELLIN_032", client_name: "Wellington Management", urgency_factor: 0.63 },
  { cpty_id: "CAPITAL_033", client_name: "Capital Group", urgency_factor: 0.60 },
  { cpty_id: "NEUBER_034", client_name: "Neuberger Berman", urgency_factor: 0.58 },
  { cpty_id: "ALLIANCE_035", client_name: "AllianceBernstein", urgency_factor: 0.62 },
  { cpty_id: "JANUS_036", client_name: "Janus Henderson", urgency_factor: 0.56 },

  // Tier 7 - Family Offices & Private Wealth
  { cpty_id: "SOROS_037", client_name: "Soros Fund Management", urgency_factor: 0.73 },
  { cpty_id: "TIGER_038", client_name: "Tiger Global Management", urgency_factor: 0.77 },
  { cpty_id: "VIKING_039", client_name: "Viking Global Investors", urgency_factor: 0.74 },
  { cpty_id: "MAVERICK_040", client_name: "Maverick Capital", urgency_factor: 0.71 },

  // Tier 8 - Proprietary Trading / Market Makers
  { cpty_id: "JUMP_041", client_name: "Jump Trading", urgency_factor: 0.96 },
  { cpty_id: "VIRTU_042", client_name: "Virtu Financial", urgency_factor: 0.94 },
  { cpty_id: "SUSQ_043", client_name: "Susquehanna International", urgency_factor: 0.95 },
  { cpty_id: "OPTIVER_044", client_name: "Optiver", urgency_factor: 0.93 },
  { cpty_id: "IMC_045", client_name: "IMC Trading", urgency_factor: 0.94 },

  // Tier 9 - Mutual Fund Complexes
  { cpty_id: "AMUNDI_046", client_name: "Amundi Asset Management", urgency_factor: 0.54 },
  { cpty_id: "DWS_047", client_name: "DWS Group", urgency_factor: 0.51 },
  { cpty_id: "LGIM_048", client_name: "Legal & General Investment", urgency_factor: 0.49 },
  { cpty_id: "SCHROD_049", client_name: "Schroders", urgency_factor: 0.53 },
  { cpty_id: "ABERDEEN_050", client_name: "abrdn", urgency_factor: 0.47 },
];

const MOCK_SYMBOLS = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "BAJFINANCE.NS",
  "KOTAKBANK.NS", "LT.NS", "ASIANPAINT.NS", "AXISBANK.NS", "MARUTI.NS",
  "SUNPHARMA.NS", "TITAN.NS", "ULTRACEMCO.NS", "NESTLEIND.NS", "WIPRO.NS",
  "HCLTECH.NS", "TECHM.NS", "BAJAJFINSV.NS", "POWERGRID.NS", "NTPC.NS",
  "TATAMOTORS.NS", "TATASTEEL.NS", "ADANIPORTS.NS", "ONGC.NS", "JSWSTEEL.NS",
  "HINDALCO.NS", "INDUSINDBK.NS", "COALINDIA.NS", "M&M.NS", "DIVISLAB.NS",
  "CIPLA.NS", "DRREDDY.NS", "EICHERMOT.NS", "GRASIM.NS", "HEROMOTOCO.NS",
  "SHREECEM.NS", "BRITANNIA.NS", "APOLLOHOSP.NS", "BAJAJ-AUTO.NS", "BPCL.NS",
  "ADANIENT.NS", "SBILIFE.NS", "HDFCLIFE.NS", "TATACONSUM.NS", "LTIM.NS",
  "ADANIGREEN.NS", "BANKBARODA.NS", "BERGEPAINT.NS", "DLF.NS", "GODREJCP.NS",
  "INDIGO.NS", "MARICO.NS", "PIDILITIND.NS", "SIEMENS.NS", "DABUR.NS",
  "HAVELLS.NS", "CHOLAFIN.NS", "COLPAL.NS", "GAIL.NS", "IOC.NS",
  "IRCTC.NS", "PFC.NS", "PNB.NS", "ZOMATO.NS", "PAYTM.NS",
  "NYKAA.NS", "DELHIVERY.NS", "POLICYBZR.NS"
];

const MOCK_MARKET = {
  "RELIANCE.NS": { ltp: 2587.45, bid: 2587.20, ask: 2587.70, volatility_pct: 1.8, avg_trade_size: 8500, instrument: "RELIANCE.NS EQ" },
  "TCS.NS": { ltp: 4156.30, bid: 4156.00, ask: 4156.60, volatility_pct: 1.2, avg_trade_size: 4200, instrument: "TCS.NS EQ" },
  "HDFCBANK.NS": { ltp: 1742.85, bid: 1742.50, ask: 1743.20, volatility_pct: 1.5, avg_trade_size: 11000, instrument: "HDFCBANK.NS EQ" },
  "INFY.NS": { ltp: 1876.20, bid: 1875.90, ask: 1876.50, volatility_pct: 1.3, avg_trade_size: 9800, instrument: "INFY.NS EQ" },
  "ICICIBANK.NS": { ltp: 1298.75, bid: 1298.40, ask: 1299.10, volatility_pct: 1.7, avg_trade_size: 13500, instrument: "ICICIBANK.NS EQ" },
  "HINDUNILVR.NS": { ltp: 2456.90, bid: 2456.50, ask: 2457.30, volatility_pct: 1.0, avg_trade_size: 3800, instrument: "HINDUNILVR.NS EQ" },
  "ITC.NS": { ltp: 468.35, bid: 468.20, ask: 468.50, volatility_pct: 0.9, avg_trade_size: 24000, instrument: "ITC.NS EQ" },
  "SBIN.NS": { ltp: 826.50, bid: 826.20, ask: 826.80, volatility_pct: 2.2, avg_trade_size: 18000, instrument: "SBIN.NS EQ" },
  "BHARTIARTL.NS": { ltp: 1705.60, bid: 1705.30, ask: 1705.90, volatility_pct: 1.4, avg_trade_size: 9200, instrument: "BHARTIARTL.NS EQ" },
  "BAJFINANCE.NS": { ltp: 7234.25, bid: 7233.50, ask: 7235.00, volatility_pct: 2.1, avg_trade_size: 1800, instrument: "BAJFINANCE.NS EQ" },
  "KOTAKBANK.NS": { ltp: 1798.40, bid: 1798.00, ask: 1798.80, volatility_pct: 1.6, avg_trade_size: 7500, instrument: "KOTAKBANK.NS EQ" },
  "LT.NS": { ltp: 3642.70, bid: 3642.20, ask: 3643.20, volatility_pct: 1.9, avg_trade_size: 4100, instrument: "LT.NS EQ" },
  "ASIANPAINT.NS": { ltp: 2876.55, bid: 2876.00, ask: 2877.10, volatility_pct: 1.4, avg_trade_size: 3200, instrument: "ASIANPAINT.NS EQ" },
  "AXISBANK.NS": { ltp: 1142.30, bid: 1142.00, ask: 1142.60, volatility_pct: 1.8, avg_trade_size: 10500, instrument: "AXISBANK.NS EQ" },
  "MARUTI.NS": { ltp: 12456.80, bid: 12455.50, ask: 12458.10, volatility_pct: 1.7, avg_trade_size: 950, instrument: "MARUTI.NS EQ" },
  "SUNPHARMA.NS": { ltp: 1798.25, bid: 1797.90, ask: 1798.60, volatility_pct: 1.5, avg_trade_size: 6800, instrument: "SUNPHARMA.NS EQ" },
  "TITAN.NS": { ltp: 3487.90, bid: 3487.40, ask: 3488.40, volatility_pct: 1.6, avg_trade_size: 3500, instrument: "TITAN.NS EQ" },
  "ULTRACEMCO.NS": { ltp: 11234.65, bid: 11233.00, ask: 11236.30, volatility_pct: 1.5, avg_trade_size: 780, instrument: "ULTRACEMCO.NS EQ" },
  "NESTLEIND.NS": { ltp: 2587.40, bid: 2586.90, ask: 2587.90, volatility_pct: 0.8, avg_trade_size: 2100, instrument: "NESTLEIND.NS EQ" },
  "WIPRO.NS": { ltp: 578.65, bid: 578.40, ask: 578.90, volatility_pct: 1.4, avg_trade_size: 15000, instrument: "WIPRO.NS EQ" },
  "HCLTECH.NS": { ltp: 1876.35, bid: 1876.00, ask: 1876.70, volatility_pct: 1.3, avg_trade_size: 6200, instrument: "HCLTECH.NS EQ" },
  "TECHM.NS": { ltp: 1687.50, bid: 1687.20, ask: 1687.80, volatility_pct: 1.5, avg_trade_size: 5400, instrument: "TECHM.NS EQ" },
  "BAJAJFINSV.NS": { ltp: 1698.75, bid: 1698.40, ask: 1699.10, volatility_pct: 1.8, avg_trade_size: 4900, instrument: "BAJAJFINSV.NS EQ" },
  "POWERGRID.NS": { ltp: 324.85, bid: 324.70, ask: 325.00, volatility_pct: 1.1, avg_trade_size: 28000, instrument: "POWERGRID.NS EQ" },
  "NTPC.NS": { ltp: 356.90, bid: 356.75, ask: 357.05, volatility_pct: 1.3, avg_trade_size: 32000, instrument: "NTPC.NS EQ" },
  "TATAMOTORS.NS": { ltp: 987.45, bid: 987.10, ask: 987.80, volatility_pct: 2.8, avg_trade_size: 12000, instrument: "TATAMOTORS.NS EQ" },
  "TATASTEEL.NS": { ltp: 154.60, bid: 154.50, ask: 154.70, volatility_pct: 2.6, avg_trade_size: 45000, instrument: "TATASTEEL.NS EQ" },
  "ADANIPORTS.NS": { ltp: 1287.35, bid: 1287.00, ask: 1287.70, volatility_pct: 2.3, avg_trade_size: 8900, instrument: "ADANIPORTS.NS EQ" },
  "ONGC.NS": { ltp: 287.50, bid: 287.35, ask: 287.65, volatility_pct: 1.9, avg_trade_size: 38000, instrument: "ONGC.NS EQ" },
  "JSWSTEEL.NS": { ltp: 978.25, bid: 977.90, ask: 978.60, volatility_pct: 2.4, avg_trade_size: 11500, instrument: "JSWSTEEL.NS EQ" },
  "HINDALCO.NS": { ltp: 645.80, bid: 645.50, ask: 646.10, volatility_pct: 2.2, avg_trade_size: 17000, instrument: "HINDALCO.NS EQ" },
  "INDUSINDBK.NS": { ltp: 1456.90, bid: 1456.50, ask: 1457.30, volatility_pct: 2.0, avg_trade_size: 7800, instrument: "INDUSINDBK.NS EQ" },
  "COALINDIA.NS": { ltp: 432.75, bid: 432.55, ask: 432.95, volatility_pct: 1.6, avg_trade_size: 22000, instrument: "COALINDIA.NS EQ" },
  "M&M.NS": { ltp: 2987.60, bid: 2987.10, ask: 2988.10, volatility_pct: 2.1, avg_trade_size: 3800, instrument: "M&M.NS EQ" },
  "DIVISLAB.NS": { ltp: 5876.40, bid: 5875.50, ask: 5877.30, volatility_pct: 1.5, avg_trade_size: 1650, instrument: "DIVISLAB.NS EQ" },
  "CIPLA.NS": { ltp: 1465.85, bid: 1465.50, ask: 1466.20, volatility_pct: 1.4, avg_trade_size: 5900, instrument: "CIPLA.NS EQ" },
  "DRREDDY.NS": { ltp: 1298.70, bid: 1298.30, ask: 1299.10, volatility_pct: 1.6, avg_trade_size: 6400, instrument: "DRREDDY.NS EQ" },
  "EICHERMOT.NS": { ltp: 4876.25, bid: 4875.50, ask: 4877.00, volatility_pct: 1.8, avg_trade_size: 2100, instrument: "EICHERMOT.NS EQ" },
  "GRASIM.NS": { ltp: 2654.90, bid: 2654.40, ask: 2655.40, volatility_pct: 1.7, avg_trade_size: 3600, instrument: "GRASIM.NS EQ" },
  "HEROMOTOCO.NS": { ltp: 4987.35, bid: 4986.50, ask: 4988.20, volatility_pct: 1.6, avg_trade_size: 1900, instrument: "HEROMOTOCO.NS EQ" },
  "SHREECEM.NS": { ltp: 27654.80, bid: 27652.00, ask: 27657.60, volatility_pct: 1.4, avg_trade_size: 320, instrument: "SHREECEM.NS EQ" },
  "BRITANNIA.NS": { ltp: 5234.65, bid: 5233.80, ask: 5235.50, volatility_pct: 1.2, avg_trade_size: 1750, instrument: "BRITANNIA.NS EQ" },
  "APOLLOHOSP.NS": { ltp: 7123.45, bid: 7122.50, ask: 7124.40, volatility_pct: 1.5, avg_trade_size: 1300, instrument: "APOLLOHOSP.NS EQ" },
  "BAJAJ-AUTO.NS": { ltp: 9876.90, bid: 9875.50, ask: 9878.30, volatility_pct: 1.7, avg_trade_size: 980, instrument: "BAJAJ-AUTO.NS EQ" },
  "BPCL.NS": { ltp: 312.85, bid: 312.65, ask: 313.05, volatility_pct: 2.0, avg_trade_size: 29000, instrument: "BPCL.NS EQ" },
  "ADANIENT.NS": { ltp: 2456.70, bid: 2456.20, ask: 2457.20, volatility_pct: 2.9, avg_trade_size: 5200, instrument: "ADANIENT.NS EQ" },
  "SBILIFE.NS": { ltp: 1587.40, bid: 1587.00, ask: 1587.80, volatility_pct: 1.3, avg_trade_size: 5600, instrument: "SBILIFE.NS EQ" },
  "HDFCLIFE.NS": { ltp: 687.25, bid: 687.00, ask: 687.50, volatility_pct: 1.4, avg_trade_size: 13500, instrument: "HDFCLIFE.NS EQ" },
  "TATACONSUM.NS": { ltp: 1087.60, bid: 1087.30, ask: 1087.90, volatility_pct: 1.5, avg_trade_size: 8200, instrument: "TATACONSUM.NS EQ" },
  "LTIM.NS": { ltp: 6234.85, bid: 6234.00, ask: 6235.70, volatility_pct: 1.6, avg_trade_size: 1450, instrument: "LTIM.NS EQ" },
  "ADANIGREEN.NS": { ltp: 1876.40, bid: 1875.80, ask: 1877.00, volatility_pct: 3.2, avg_trade_size: 4800, instrument: "ADANIGREEN.NS EQ" },
  "BANKBARODA.NS": { ltp: 245.80, bid: 245.60, ask: 246.00, volatility_pct: 2.5, avg_trade_size: 35000, instrument: "BANKBARODA.NS EQ" },
  "BERGEPAINT.NS": { ltp: 487.90, bid: 487.60, ask: 488.20, volatility_pct: 1.8, avg_trade_size: 16000, instrument: "BERGEPAINT.NS EQ" },
  "DLF.NS": { ltp: 876.45, bid: 876.00, ask: 876.90, volatility_pct: 2.4, avg_trade_size: 10500, instrument: "DLF.NS EQ" },
  "GODREJCP.NS": { ltp: 1187.65, bid: 1187.20, ask: 1188.10, volatility_pct: 1.7, avg_trade_size: 7200, instrument: "GODREJCP.NS EQ" },
  "INDIGO.NS": { ltp: 4567.80, bid: 4566.90, ask: 4568.70, volatility_pct: 2.3, avg_trade_size: 2100, instrument: "INDIGO.NS EQ" },
  "MARICO.NS": { ltp: 634.50, bid: 634.20, ask: 634.80, volatility_pct: 1.4, avg_trade_size: 14000, instrument: "MARICO.NS EQ" },
  "PIDILITIND.NS": { ltp: 3187.40, bid: 3186.80, ask: 3188.00, volatility_pct: 1.6, avg_trade_size: 2800, instrument: "PIDILITIND.NS EQ" },
  "SIEMENS.NS": { ltp: 7654.90, bid: 7653.80, ask: 7656.00, volatility_pct: 1.8, avg_trade_size: 1150, instrument: "SIEMENS.NS EQ" },
  "DABUR.NS": { ltp: 498.75, bid: 498.50, ask: 499.00, volatility_pct: 1.3, avg_trade_size: 17500, instrument: "DABUR.NS EQ" },
  "HAVELLS.NS": { ltp: 1698.30, bid: 1697.80, ask: 1698.80, volatility_pct: 1.9, avg_trade_size: 5100, instrument: "HAVELLS.NS EQ" },
  "CHOLAFIN.NS": { ltp: 1354.60, bid: 1354.20, ask: 1355.00, volatility_pct: 2.1, avg_trade_size: 6700, instrument: "CHOLAFIN.NS EQ" },
  "COLPAL.NS": { ltp: 2987.85, bid: 2987.20, ask: 2988.50, volatility_pct: 1.2, avg_trade_size: 2900, instrument: "COLPAL.NS EQ" },
  "GAIL.NS": { ltp: 198.45, bid: 198.30, ask: 198.60, volatility_pct: 1.8, avg_trade_size: 42000, instrument: "GAIL.NS EQ" },
  "IOC.NS": { ltp: 143.70, bid: 143.60, ask: 143.80, volatility_pct: 2.0, avg_trade_size: 58000, instrument: "IOC.NS EQ" },
  "IRCTC.NS": { ltp: 876.90, bid: 876.40, ask: 877.40, volatility_pct: 2.7, avg_trade_size: 10800, instrument: "IRCTC.NS EQ" },
  "PFC.NS": { ltp: 487.25, bid: 487.00, ask: 487.50, volatility_pct: 1.9, avg_trade_size: 18500, instrument: "PFC.NS EQ" },
  "PNB.NS": { ltp: 107.85, bid: 107.75, ask: 107.95, volatility_pct: 2.6, avg_trade_size: 78000, instrument: "PNB.NS EQ" },
  "ZOMATO.NS": { ltp: 267.80, bid: 267.40, ask: 268.20, volatility_pct: 3.8, avg_trade_size: 32000, instrument: "ZOMATO.NS EQ" },
  "PAYTM.NS": { ltp: 987.45, bid: 986.80, ask: 988.10, volatility_pct: 4.2, avg_trade_size: 8900, instrument: "PAYTM.NS EQ" },
  "NYKAA.NS": { ltp: 187.65, bid: 187.30, ask: 188.00, volatility_pct: 3.5, avg_trade_size: 42000, instrument: "NYKAA.NS EQ" },
  "DELHIVERY.NS": { ltp: 354.80, bid: 354.40, ask: 355.20, volatility_pct: 3.9, avg_trade_size: 24000, instrument: "DELHIVERY.NS EQ" },
  "POLICYBZR.NS": { ltp: 1876.90, bid: 1876.20, ask: 1877.60, volatility_pct: 3.6, avg_trade_size: 4200, instrument: "POLICYBZR.NS EQ" },
};

function mockPrefill(input) {
  const market = MOCK_MARKET[input.symbol] || MOCK_MARKET["RELIANCE.NS"];
  const client = MOCK_CLIENTS.find(c => c.cpty_id === input.cpty_id) || MOCK_CLIENTS[0];
  const notes = (input.order_notes || "").toLowerCase();

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

  let side = input.side || null;
  let sideConf = "LOW", sideRat = "Require manual selection";
  if (side) {
    sideConf = "HIGH"; sideRat = "User-specified side";
  } else if (notes.includes("buy") || notes.includes("purchase") || notes.includes("long")) {
    side = "Buy"; sideConf = "HIGH"; sideRat = "Order notes indicate buy instruction";
  } else if (notes.includes("sell") || notes.includes("liquidate") || notes.includes("short")) {
    side = "Sell"; sideConf = "HIGH"; sideRat = "Order notes indicate sell instruction";
  }

  const casActive = ttc <= 25;
  const refPrice = market.ltp;
  const upperBand = +(refPrice * 1.03).toFixed(1);
  const lowerBand = +(refPrice * 0.97).toFixed(1);

  let orderType, orderTypeRat;
  if (casActive) {
    orderType = "Limit"; orderTypeRat = "CAS window detected. Limit order required for auction participation within ±3% band.";
  } else if (urgencyScore > 80 && client.urgency_factor > 0.7) {
    orderType = "Market"; orderTypeRat = "High urgency + low price sensitivity → Market order for guaranteed fill";
  } else {
    orderType = "Limit"; orderTypeRat = "Standard limit order for price protection";
  }

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

  let tif, tifRat;
  if (casActive) { tif = "CAS"; tifRat = "CAS session: Order valid only for closing auction window"; }
  else if (urgencyScore > 90 && notes.includes("immediate")) { tif = "IOC"; tifRat = "Critical urgency: IOC ensures immediate execution attempt"; }
  else { tif = "GFD"; tifRat = "Standard day order: Valid until market close"; }

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

  const pricing = urgencyScore > 70 ? "Adaptive" : market.volatility_pct > 2.5 ? "Passive" : "Adaptive";
  const pricingRat = urgencyScore > 70 ? "High urgency: Adaptive pricing crosses spread when necessary" : "Standard adaptive pricing balances aggression and patience";
  const urgSetting = urgencyScore > 80 ? "High" : urgencyScore > 50 ? "Auto" : "Low";
  const getDone = urgencyScore > 75 || notes.includes("must complete");
  const openPrint = ttc > 300;
  const closePrint = ttc < 60;
  const closePct = closePrint ? (urgencyScore > 80 ? 30 : 20) : 0;

  const crossEnabled = sizeRatio > 5;
  const minCross = crossEnabled ? Math.round(input.size * 0.2) : null;
  const maxCross = crossEnabled ? Math.round(input.size * 0.5) : null;

  const iwEnabled = urgencyScore < 40;
  const iwPrice = iwEnabled ? +(market.ltp * (side === "Sell" ? 1.005 : 0.995)).toFixed(1) : null;
  const iwQty = iwEnabled ? Math.round(input.size * 0.3) : null;

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
        pricing: { value: pricing, confidence: "HIGH", rationale: pricingRat },
        layering: { value: "Auto", confidence: "HIGH", rationale: "Auto-layering optimizes order book placement dynamically" },
        urgency_setting: { value: urgSetting, confidence: "HIGH", rationale: `Urgency score: ${urgencyScore}/100 → ${urgSetting}` },
        get_done: { value: getDone ? "True" : "False", confidence: "HIGH", rationale: getDone ? "Force completion by end time" : "Allow unfilled quantity to remain" },
        opening_print: { value: openPrint ? "True" : "False", confidence: "HIGH", rationale: openPrint ? "Participate in opening auction for early liquidity" : "Order entered after open" },
        opening_pct: { value: openPrint ? 10 : 0, confidence: "MEDIUM", rationale: "Max % in opening auction" },
        closing_print: { value: closePrint ? "True" : "False", confidence: "HIGH", rationale: closePrint ? "Approaching close - participate in closing auction" : "Sufficient time remaining" },
        closing_pct: { value: closePct, confidence: "MEDIUM", rationale: `Max ${closePct}% in closing auction` },
        min_cross_qty: { value: minCross, confidence: "MEDIUM", rationale: crossEnabled ? "Large order: Enable crossing for 20% blocks" : "Not applicable" },
        max_cross_qty: { value: maxCross, confidence: "MEDIUM", rationale: crossEnabled ? "Large order: Enable crossing for 50% blocks" : "Not applicable" },
        cross_qty_unit: { value: "Shares", confidence: "HIGH", rationale: "Standard unit" },
        leave_active_slice: { value: "False", confidence: "HIGH", rationale: "Avoid over-execution during cross" },
        iwould_price: { value: iwPrice, confidence: "MEDIUM", rationale: iwEnabled ? "Opportunistic execution price" : "Not applicable for urgent orders" },
        iwould_qty: { value: iwQty, confidence: "MEDIUM", rationale: iwEnabled ? "30% of total order" : "Not applicable" },
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

const DRIVER_FIELDS = new Set(["Side"]);

// ─── COMPACT FIELD ──────────────────────────────────────────────
function CompactField({ label, value, options, hasRun, confidence, rationale, icon, type, disabled: forceDisabled, onDriverChange, recalcGeneration }) {
  const [isEdited, setIsEdited] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [showTip, setShowTip] = useState(false);
  const [flash, setFlash] = useState(false);
  const tipRef = useRef(null);
  const prevValueRef = useRef(value);
  const isDriver = DRIVER_FIELDS.has(label);

  useEffect(() => {
    if (isDriver && isEdited) return;
    const changed = prevValueRef.current !== value;
    setCurrentValue(value);
    setIsEdited(false);
    prevValueRef.current = value;
    if (changed && hasRun) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(t);
    }
  }, [value, recalcGeneration]);

  useEffect(() => {
    if (!showTip) return;
    const handler = (e) => { if (tipRef.current && !tipRef.current.contains(e.target)) setShowTip(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTip]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setIsEdited(true);
    setCurrentValue(newVal);
    if (isDriver && onDriverChange) onDriverChange(label, newVal);
  };

  const confColor = confidence === "HIGH" ? "#00d9ff" : confidence === "MEDIUM" ? "#ffaa00" : "#ff4444";
  const displayVal = currentValue ?? "";
  const isDisabled = !hasRun || forceDisabled;
  const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
  const IconComp = icon;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "100px 1fr 16px 16px", alignItems: "center", gap: "6px",
      padding: "3px 6px", borderRadius: "2px", transition: "all 0.3s",
      background: flash ? "rgba(0,217,255,0.08)" : isEdited ? "rgba(255,170,0,0.05)" : "transparent",
      borderLeft: isDriver && isEdited ? "2px solid #00d9ff" : isEdited ? "2px solid #ffaa00" : flash ? "2px solid #00d9ff" : "2px solid transparent",
      minHeight: "24px", fontSize: "10px", opacity: hasRun ? 1 : 0.4
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#7a8599", fontFamily: "monospace", fontSize: "9px" }}>
        {IconComp && <IconComp size={10} />}
        <span>{label}</span>
      </div>
      
      {options ? (
        <select value={hasRun ? (currentValue || "") : ""} disabled={isDisabled} onChange={handleChange}
          style={{ background: "#0a0e1a", border: "1px solid #1a2332", borderRadius: "2px", padding: "2px 4px",
                   color: "#e0e6f0", fontSize: "10px", fontFamily: "monospace", cursor: isDisabled ? "default" : "pointer" }}>
          <option value="" disabled>--</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input 
  type={inputType} 
  value={
    hasRun 
      ? (inputType === "date" && !currentValue ? "" : (currentValue ?? "--")) 
      : ""
  } 
  disabled={isDisabled} 
  onChange={handleChange}
  onClick={(e) => hasRun && e.target.select()}
  style={{ 
    background: "#0a0e1a", 
    border: "1px solid #1a2332", 
    borderRadius: "2px", 
    padding: "2px 4px",
    color: "#e0e6f0", 
    fontSize: "10px", 
    fontFamily: "monospace", 
    minWidth: 0 
  }} 
/>
      )}
      
      <div style={{ width: "16px", textAlign: "center" }}>
        {hasRun && (isEdited ? (isDriver ? <RefreshCw size={10} color="#00d9ff" /> : <Pencil size={10} color="#ffaa00" />) : <Check size={10} color={confColor} />)}
      </div>
      
      {hasRun && rationale && (
        <div ref={tipRef} style={{ position: "relative" }}>
          <button onClick={() => setShowTip(!showTip)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#7a8599", display: "flex" }}>
            <Info size={10} />
          </button>
          {showTip && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "4px", background: "#12161f",
                          border: "1px solid #1a2332", borderRadius: "4px", padding: "6px 8px", fontSize: "9px",
                          color: "#b0b8c8", width: "220px", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.6)", lineHeight: 1.4 }}>
              <div style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.05em", color: confColor, marginBottom: "3px", fontWeight: 600 }}>
                {confidence} CONFIDENCE
              </div>
              {isDriver && <div style={{ fontSize: "8px", color: "#00d9ff", marginBottom: "3px", fontWeight: 600 }}>⚡ DRIVER FIELD</div>}
              {rationale}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PANEL HEADER ───────────────────────────────────────────────
function PanelHeader({ title, icon, tag }) {
  const IconComp = icon;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", background: "#0d111a",
                  borderBottom: "1px solid #1a2332", fontSize: "9px", fontWeight: 600, color: "#00d9ff",
                  textTransform: "uppercase", letterSpacing: "0.05em" }}>
      <IconComp size={11} />
      <span>{title}</span>
      {tag && <span style={{ marginLeft: "auto", padding: "1px 5px", background: tag === "CAS" ? "rgba(255,68,68,0.2)" : "rgba(0,217,255,0.2)",
                              color: tag === "CAS" ? "#ff4444" : "#00d9ff", borderRadius: "2px", fontSize: "8px" }}>{tag}</span>}
    </div>
  );
}

// ─── URGENCY STRIP ──────────────────────────────────────────────
function UrgencyStrip({ score, classification, breakdown }) {
  const color = classification === "CRITICAL" ? "#ff4444" : classification === "HIGH" ? "#ff8800" : classification === "MEDIUM" ? "#ffaa00" : "#00d966";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", background: "#0d111a",
                  border: "1px solid #1a2332", borderRadius: "3px", fontSize: "10px" }}>
      <Gauge size={12} style={{ color }} />
      <span style={{ color: "#7a8599", fontFamily: "monospace", fontSize: "9px" }}>URGENCY</span>
      <span style={{ fontSize: "16px", fontWeight: 700, color, fontFamily: "monospace" }}>{score}</span>
      <span style={{ fontSize: "8px", color: "#7a8599" }}>/100</span>
      <span style={{ padding: "2px 6px", background: `${color}22`, color, borderRadius: "2px", fontSize: "8px", fontWeight: 700 }}>{classification}</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: "8px", fontSize: "9px", fontFamily: "monospace", color: "#7a8599" }}>
        <span>T:{breakdown.time_pressure.toFixed(1)}</span>
        <span>S:{breakdown.size_pressure.toFixed(1)}</span>
        <span>C:{breakdown.client_factor.toFixed(1)}</span>
        <span>N:{breakdown.notes_urgency}</span>
      </div>
    </div>
  );
}

// ─── MARKET STRIP ───────────────────────────────────────────────
function MarketStrip({ ctx }) {
  if (!ctx) return null;
  const stateColors = { CAS: "#ff4444", Pre_Close: "#ff8800", Continuous: "#00d966" };
  const col = stateColors[ctx.market_state] || "#888";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 8px", background: "#0d111a",
                  border: "1px solid #1a2332", borderRadius: "3px", fontSize: "9px", fontFamily: "monospace" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <CircleDot size={8} style={{ color: col }} />
        <span style={{ color: col, fontWeight: 700 }}>{ctx.market_state}</span>
      </div>
      {ctx.cas_active && <span style={{ padding: "1px 5px", background: "rgba(255,68,68,0.2)", color: "#ff4444", borderRadius: "2px", fontSize: "8px", fontWeight: 700 }}>
        CAS {ctx.time_to_close}m
      </span>}
      <span style={{ color: "#7a8599" }}>LTP ₹{ctx.ltp}</span>
      <span style={{ color: "#7a8599" }}>BID ₹{ctx.bid}</span>
      <span style={{ color: "#7a8599" }}>ASK ₹{ctx.ask}</span>
      <span style={{ color: "#7a8599" }}>SPR {ctx.spread_bps}bp</span>
      <span style={{ color: "#7a8599" }}>VOL {ctx.volatility}%</span>
      {ctx.cas_active && <span style={{ color: "#ff8800", fontSize: "8px", marginLeft: "auto" }}>
        BAND: ₹{ctx.cas_lower_band} - ₹{ctx.cas_upper_band}
      </span>}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────
export default function AUOTerminal() {
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
  const [driverOverrides, setDriverOverrides] = useState({});
  const [recalcGen, setRecalcGen] = useState(0);
  const [recalcCount, setRecalcCount] = useState(0);

  const filteredSymbols = MOCK_SYMBOLS.filter(s => s.toLowerCase().includes(symbolSearch.toLowerCase()));
  const debounceRef = useRef(null);
  const allFilled = !!(symbol && cpty && qty);

  const handleDriverChange = useCallback((fieldLabel, newValue) => {
    setDriverOverrides(prev => ({ ...prev, [fieldLabel]: newValue }));
  }, []);

  const overridesKey = JSON.stringify(driverOverrides);

  useEffect(() => {
    if (!allFilled) {
      setResult(null); setHasRun(false); setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const inputData = { symbol, cpty_id: cpty, size: +qty, order_notes: notes, time_to_close: ttc, side: driverOverrides["Side"] || null };
        let res;
        if (API_BASE) {
          const resp = await fetch(`${API_BASE}/api/prefill`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inputData)
          });
          if (!resp.ok) throw new Error(`API error ${resp.status}`);
          res = await resp.json();
        } else {
          res = await mockPrefill(inputData);
        }
        setResult(res); setHasRun(true); setRecalcGen(g => g + 1); setRecalcCount(c => c + 1);
      } catch (err) {
        console.error("AUO prefill error:", err);
      }
      setLoading(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [symbol, cpty, qty, notes, ttc, allFilled, overridesKey]);

  const resetAll = () => {
    setResult(null); setHasRun(false); setSymbol(""); setCpty(""); setQty(""); setNotes(""); setTtc(25);
    setDriverOverrides({}); setRecalcCount(0);
  };

  const p = result?.prefilled_params || {};
  const ctx = result?.market_context;
  const getValue = (v) => v?.value ?? "--";
  const handleSubmit = async () => {
    if (!result) return;
    
    try {
      const payload = {
        symbol: symbol,
        cpty_id: cpty,
        // Prioritize driver override, fallback to AI suggestion, fallback to null
        side: driverOverrides["Side"] || result.prefilled_params.side?.value || null,
        size: +qty,
        order_notes: notes,
        prefilled_params: result.prefilled_params,
        trader_overrides: driverOverrides
      };

      // Check if we are in API mode
      if (API_BASE) {
        const resp = await fetch(`${API_BASE}/api/orders/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error(`Server error: ${resp.status}`);

        const data = await resp.json();
        if (data.status === "submitted") {
          alert(`✅ Order Placed Successfully!\nOrder ID: ${data.order_id}\nTime: ${data.submission_time}`);
          resetAll();
        }
      } else {
        // Mock Fallback
        alert("Mock Submit: Order validated (No API connection)");
        resetAll();
      }
    } catch (e) {
      alert("❌ Submission failed: " + e.message);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050810", color: "#e0e6f0", fontFamily: "monospace", overflow: "hidden" }}>
      <style>{`
        :root { --bg: #050810; --surface: #0a0e1a; --border: #1a2332; --accent: #00d9ff; --text: #e0e6f0; --dim: #7a8599; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, textarea, button { font-family: monospace; }
        input:focus, select:focus, textarea:focus { outline: 1px solid #00d9ff; border-color: #00d9ff !important; }
        ::selection { background: #00d9ff; color: #000; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 3px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse { animation: pulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* HEADER BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px",
                    background: "#0a0e1a", borderBottom: "1px solid #1a2332" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap size={14} style={{ color: "#00d9ff" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>AUO TERMINAL</span>
          <span style={{ fontSize: "8px", color: "#7a8599", marginLeft: "4px" }}>ADAPTIVE URGENCY ORCHESTRATOR</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "8px", color: "#7a8599" }}>
          {result && <span>v{result.metadata.auo_version} · {result.metadata.processing_time_ms}ms · {result.metadata.confidence_score}</span>}
          {recalcCount > 1 && <span style={{ padding: "2px 6px", background: "rgba(0,217,255,0.1)", borderRadius: "2px", color: "#00d9ff" }}>
            {recalcCount} RECALC
          </span>}
          <span style={{ padding: "2px 6px", background: "#0d111a", borderRadius: "2px" }}>{API_BASE ? "⚡ API" : "🧪 MOCK"}</span>
        </div>
      </div>

      {/* MAIN GRID: 20% / 80% split */}
      <div style={{ display: "grid", gridTemplateColumns: "20% 80%", gridTemplateRows: "auto 1fr",
                    height: "calc(100vh - 33px)", gap: "1px", background: "#1a2332" }}>
        
        {/* LEFT COLUMN: Input (20%) */}
        <div style={{ gridColumn: "1", gridRow: "1 / 3", background: "#0a0e1a", padding: "8px", display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto" }}>
          <div style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#7a8599", fontWeight: 600, marginBottom: "2px" }}>
            ORDER INPUT
          </div>

          {/* Symbol */}
          <div style={{ position: "relative" }}>
            <label style={{ fontSize: "8px", color: "#7a8599", marginBottom: "2px", display: "block" }}>SYMBOL</label>
            <input type="text" placeholder="Search..." value={symbol || symbolSearch}
              onChange={(e) => { setSymbolSearch(e.target.value); setSymbol(""); setShowSymbols(true); }}
              onFocus={() => setShowSymbols(true)}
              style={{ width: "100%", padding: "4px 6px", background: "#050810", border: "1px solid #1a2332",
                       borderRadius: "2px", color: "#e0e6f0", fontSize: "10px" }} />
            {showSymbols && symbolSearch && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#0d111a",
                            border: "1px solid #1a2332", borderRadius: "0 0 2px 2px", maxHeight: "150px",
                            overflowY: "auto", zIndex: 50 }}>
                {filteredSymbols.map(s => (
                  <div key={s} onClick={() => { setSymbol(s); setSymbolSearch(""); setShowSymbols(false); }}
                    style={{ padding: "4px 6px", fontSize: "9px", cursor: "pointer", color: "#b0b8c8", borderBottom: "1px solid #1a2332" }}
                    onMouseEnter={(e) => e.target.style.background = "rgba(0,217,255,0.1)"}
                    onMouseLeave={(e) => e.target.style.background = "transparent"}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client */}
          <div>
            <label style={{ fontSize: "8px", color: "#7a8599", marginBottom: "2px", display: "block" }}>CLIENT</label>
            <select value={cpty} onChange={(e) => setCpty(e.target.value)}
              style={{ width: "100%", padding: "4px 6px", background: "#050810", border: "1px solid #1a2332",
                       borderRadius: "2px", color: "#e0e6f0", fontSize: "10px" }}>
              <option value="">Select...</option>
              {MOCK_CLIENTS.map(c => <option key={c.cpty_id} value={c.cpty_id}>{c.cpty_id} - {c.client_name}</option>)}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label style={{ fontSize: "8px", color: "#7a8599", marginBottom: "2px", display: "block" }}>QUANTITY</label>
            <input type="number" placeholder="50000" value={qty} onChange={(e) => setQty(e.target.value)}
              style={{ width: "100%", padding: "4px 6px", background: "#050810", border: "1px solid #1a2332",
                       borderRadius: "2px", color: "#e0e6f0", fontSize: "10px" }} />
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: "8px", color: "#7a8599", marginBottom: "2px", display: "block" }}>NOTES</label>
            <textarea placeholder="EOD compliance required..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              style={{ width: "100%", padding: "4px 6px", background: "#050810", border: "1px solid #1a2332",
                       borderRadius: "2px", color: "#e0e6f0", fontSize: "9px", resize: "vertical" }} />
          </div>

          {/* Time Slider */}
          <div style={{ padding: "6px", background: "#0d111a", borderRadius: "3px", border: "1px solid #1a2332" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#7a8599", marginBottom: "3px" }}>
              <span>TIME TO CLOSE</span>
              <span style={{ color: ttc <= 25 ? "#ff4444" : ttc <= 60 ? "#ff8800" : "#e0e6f0", fontWeight: 700 }}>
                {ttc}min {ttc <= 25 && "(CAS)"}
              </span>
            </div>
            <input type="range" min={5} max={380} value={ttc} onChange={(e) => setTtc(+e.target.value)}
              style={{ width: "100%", accentColor: ttc <= 25 ? "#ff4444" : "#00d9ff" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7px", color: "#7a8599", marginTop: "2px" }}>
              <span>9:30</span><span>11AM</span><span>1PM</span><span>2:30</span><span>3:05</span><span>3:20</span>
            </div>
          </div>

          {/* Status */}
          <div style={{ padding: "6px", borderRadius: "3px", background: loading ? "rgba(0,217,255,0.08)" : hasRun ? "rgba(0,217,102,0.08)" : "#0d111a",
                        border: `1px solid ${loading ? "#00d9ff" : hasRun ? "#00d966" : "#1a2332"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "9px", fontWeight: 600 }}>
            {loading ? (
              <>
                <Activity size={10} className="pulse" style={{ color: "#00d9ff" }} />
                <span style={{ color: "#00d9ff" }}>COMPUTING...</span>
              </>
            ) : hasRun ? (
              <>
                <Check size={10} style={{ color: "#00d966" }} />
                <span style={{ color: "#00d966" }}>LIVE AUTO-RECALC</span>
              </>
            ) : (
              <>
                <CircleDot size={10} style={{ color: "#7a8599" }} />
                <span style={{ color: "#7a8599" }}>{!symbol ? "ENTER SYMBOL" : !cpty ? "SELECT CLIENT" : "ENTER QTY"}</span>
              </>
            )}
          </div>

          {hasRun && (
  <div style={{ padding: "8px", background: "#0a0e1a", borderTop: "1px solid #1a2332", display: "flex", gap: "8px" }}>
    
    {/* UPDATED SUBMIT BUTTON */}
    <button onClick={handleSubmit}
      style={{ flex: 1, padding: "12px", background: "#00d9ff", border: "none", borderRadius: "3px",
               color: "#000", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex",
               alignItems: "center", justifyContent: "center", gap: "6px" }}>
      <Send size={12} /> SUBMIT ORDER
    </button>

    <button onClick={resetAll}
      style={{ padding: "12px 20px", background: "transparent", border: "1px solid #1a2332",
               borderRadius: "3px", color: "#7a8599", fontSize: "10px", cursor: "pointer" }}>
      CANCEL
    </button>
  </div>
)}

          {/* Presets */}
          <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid #1a2332" }}>
            <div style={{ fontSize: "7px", color: "#7a8599", marginBottom: "4px", textTransform: "uppercase" }}>QUICK PRESETS</div>
            {[
  { l: "CAS EOD", sym: "RELIANCE.NS", cl: "GS_NY_001", q: "50000", n: "EOD compliance required - must attain position by close", t: 25 },
  { l: "VWAP AM", sym: "INFY.NS", cl: "VAN_US_007", q: "75000", n: "VWAP must complete by 2pm", t: 330 },
  { l: "URGENT", sym: "HDFCBANK.NS", cl: "CITADEL_017", q: "200000", n: "Urgent buy - critical allocation", t: 60 },
].map(pr => (
              <button key={pr.l} onClick={() => { setSymbol(pr.sym); setCpty(pr.cl); setQty(pr.q); setNotes(pr.n); setTtc(pr.t); setSymbolSearch(""); setDriverOverrides({}); }}
                style={{ width: "100%", padding: "4px 6px", background: "#0d111a", border: "1px solid #1a2332",
                         borderRadius: "2px", color: "#b0b8c8", fontSize: "8px", cursor: "pointer", textAlign: "left",
                         marginBottom: "3px" }}
                onMouseEnter={(e) => e.target.style.borderColor = "#00d9ff"}
                onMouseLeave={(e) => e.target.style.borderColor = "#1a2332"}>
                {pr.l}
              </button>
            ))}
          </div>
        </div>

        {/* TOP RIGHT: Urgency + Market (80%) */}
        <div style={{ gridColumn: "2", gridRow: "1", background: "#0a0e1a", padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {hasRun && result ? (
            <>
              <UrgencyStrip score={result.urgency_score} classification={result.urgency_classification} breakdown={result.urgency_breakdown} />
              <MarketStrip ctx={result.market_context} />
            </>
          ) : !loading ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#7a8599" }}>
              <SlidersHorizontal size={24} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: "10px" }}>ENTER ORDER DETAILS TO GENERATE PREFILL</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#00d9ff" }}>
              <Activity size={20} className="pulse" />
              <span style={{ fontSize: "10px" }}>COMPUTING INTELLIGENT PREFILL...</span>
            </div>
          )}
        </div>

        {/* BOTTOM RIGHT: Parameters Grid (3 columns) + Actions */}
        <div style={{ gridColumn: "2", gridRow: "2", background: "#0a0e1a", padding: "0", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          
          {/* Parameters Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", flex: 1 }}>
          
          {/* Column 1: Core Execution */}
          <div style={{ background: "#050810", display: "flex", flexDirection: "column" }}>
            <PanelHeader title="Core Execution" icon={Target} tag={ctx?.cas_active ? "CAS" : null} />
            <div style={{ padding: "4px" }}>
              <CompactField label="Instrument" value={getValue(p.instrument)} hasRun={hasRun} confidence={p.instrument?.confidence} rationale={p.instrument?.rationale} icon={Box} disabled recalcGeneration={recalcGen} />
              <CompactField label="Side" value={getValue(p.side)} options={["Buy", "Sell"]} hasRun={hasRun} confidence={p.side?.confidence} rationale={p.side?.rationale} icon={p.side?.value === "Sell" ? ArrowDownRight : ArrowUpRight} onDriverChange={handleDriverChange} recalcGeneration={recalcGen} />
              <CompactField label="Quantity" value={getValue(p.quantity)} hasRun={hasRun} confidence={p.quantity?.confidence} rationale={p.quantity?.rationale} icon={BarChart3} type="number" recalcGeneration={recalcGen} />
              <CompactField label="Order Type" value={getValue(p.order_type)} options={["Market", "Limit", "Stop", "Stop_Limit"]} hasRun={hasRun} confidence={p.order_type?.confidence} rationale={p.order_type?.rationale} icon={Layers} recalcGeneration={recalcGen} />
              <CompactField label="Price Type" value={getValue(p.price_type)} options={["Market", "Limit", "Best", "Pegged"]} hasRun={hasRun} confidence={p.price_type?.confidence} rationale={p.price_type?.rationale} icon={TrendingUp} recalcGeneration={recalcGen} />
              <CompactField label="Limit Price" value={getValue(p.limit_price)} hasRun={hasRun} confidence={p.limit_price?.confidence} rationale={p.limit_price?.rationale} icon={Target} type="number" recalcGeneration={recalcGen} />
              <CompactField label="TIF" value={getValue(p.tif)} options={["GFD", "GTD", "IOC", "FOK", "CAS"]} hasRun={hasRun} confidence={p.tif?.confidence} rationale={p.tif?.rationale} icon={Clock} recalcGeneration={recalcGen} />
              <CompactField label="Release" value={getValue(p.release_date)} hasRun={hasRun} confidence={p.release_date?.confidence} rationale={p.release_date?.rationale} icon={Clock} type="date" recalcGeneration={recalcGen} />
              <CompactField label="Hold" value={getValue(p.hold)} options={["Yes", "No"]} hasRun={hasRun} confidence={p.hold?.confidence} rationale={p.hold?.rationale} icon={Shield} recalcGeneration={recalcGen} />
              <CompactField label="Category" value={getValue(p.category)} options={["Client", "House", "Proprietary"]} hasRun={hasRun} confidence={p.category?.confidence} rationale={p.category?.rationale} icon={Shield} recalcGeneration={recalcGen} />
              <CompactField label="Capacity" value={getValue(p.capacity)} options={["Principal", "Agent", "Riskless_Principal"]} hasRun={hasRun} confidence={p.capacity?.confidence} rationale={p.capacity?.rationale} icon={Shield} recalcGeneration={recalcGen} />
              <CompactField label="Account" value={getValue(p.account)} hasRun={hasRun} confidence={p.account?.confidence} rationale={p.account?.rationale} icon={Shield} recalcGeneration={recalcGen} />
            </div>
          </div>

          {/* Column 2: Algo Strategy */}
          <div style={{ background: "#050810", display: "flex", flexDirection: "column" }}>
            <PanelHeader title="Algo Strategy" icon={Cpu} />
            <div style={{ padding: "4px" }}>
              <CompactField label="Service" value={getValue(p.service)} options={["BlueBox 2", "Market", "DMA"]} hasRun={hasRun} confidence={p.service?.confidence} rationale={p.service?.rationale} icon={Cpu} recalcGeneration={recalcGen} />
              <CompactField label="Executor" value={getValue(p.executor)} options={["VWAP", "TWAP", "POV", "ICEBERG"]} hasRun={hasRun} confidence={p.executor?.confidence} rationale={p.executor?.rationale} icon={Activity} recalcGeneration={recalcGen} />
              <CompactField label="Pricing" value={getValue(p.pricing)} options={["Adaptive", "Passive", "Aggressive"]} hasRun={hasRun} confidence={p.pricing?.confidence} rationale={p.pricing?.rationale} icon={TrendingUp} recalcGeneration={recalcGen} />
              <CompactField label="Layering" value={getValue(p.layering)} options={["Auto", "Manual", "Percentage"]} hasRun={hasRun} confidence={p.layering?.confidence} rationale={p.layering?.rationale} icon={Layers} recalcGeneration={recalcGen} />
              <CompactField label="Urgency" value={getValue(p.urgency_setting)} options={["Low", "Medium", "High", "Auto"]} hasRun={hasRun} confidence={p.urgency_setting?.confidence} rationale={p.urgency_setting?.rationale} icon={Gauge} recalcGeneration={recalcGen} />
              <CompactField label="Get Done" value={getValue(p.get_done)} options={["True", "False"]} hasRun={hasRun} confidence={p.get_done?.confidence} rationale={p.get_done?.rationale} icon={Check} recalcGeneration={recalcGen} />
              <CompactField label="Open Print" value={getValue(p.opening_print)} options={["True", "False"]} hasRun={hasRun} confidence={p.opening_print?.confidence} rationale={p.opening_print?.rationale} icon={Eye} recalcGeneration={recalcGen} />
              <CompactField label="Open %" value={getValue(p.opening_pct)} hasRun={hasRun} confidence={p.opening_pct?.confidence} rationale={p.opening_pct?.rationale} icon={Eye} type="number" recalcGeneration={recalcGen} />
              <CompactField label="Close Print" value={getValue(p.closing_print)} options={["True", "False"]} hasRun={hasRun} confidence={p.closing_print?.confidence} rationale={p.closing_print?.rationale} icon={EyeOff} recalcGeneration={recalcGen} />
              <CompactField label="Close %" value={getValue(p.closing_pct)} hasRun={hasRun} confidence={p.closing_pct?.confidence} rationale={p.closing_pct?.rationale} icon={EyeOff} type="number" recalcGeneration={recalcGen} />
            </div>
          </div>

          {/* Column 3: Advanced */}
          <div style={{ background: "#050810", display: "flex", flexDirection: "column" }}>
            <PanelHeader title="Advanced" icon={SlidersHorizontal} />
            <div style={{ padding: "4px" }}>
              <div style={{ fontSize: "8px", color: "#7a8599", padding: "3px 0", fontWeight: 600 }}>CROSSING</div>
              <CompactField label="Min Cross" value={getValue(p.min_cross_qty)} hasRun={hasRun} confidence={p.min_cross_qty?.confidence} rationale={p.min_cross_qty?.rationale} icon={Crosshair} type="number" recalcGeneration={recalcGen} />
              <CompactField label="Max Cross" value={getValue(p.max_cross_qty)} hasRun={hasRun} confidence={p.max_cross_qty?.confidence} rationale={p.max_cross_qty?.rationale} icon={Crosshair} type="number" recalcGeneration={recalcGen} />
              <CompactField label="Cross Unit" value={getValue(p.cross_qty_unit)} options={["Shares", "Value", "Percentage"]} hasRun={hasRun} confidence={p.cross_qty_unit?.confidence} rationale={p.cross_qty_unit?.rationale} icon={Crosshair} recalcGeneration={recalcGen} />
              <CompactField label="Leave Active" value={getValue(p.leave_active_slice)} options={["True", "False"]} hasRun={hasRun} confidence={p.leave_active_slice?.confidence} rationale={p.leave_active_slice?.rationale} icon={Crosshair} recalcGeneration={recalcGen} />
              
              <div style={{ fontSize: "8px", color: "#7a8599", padding: "3px 0", fontWeight: 600, marginTop: "6px" }}>IWOULD</div>
              <CompactField label="IW Price" value={getValue(p.iwould_price)} hasRun={hasRun} confidence={p.iwould_price?.confidence} rationale={p.iwould_price?.rationale} icon={Target} type="number" recalcGeneration={recalcGen} />
              <CompactField label="IW Qty" value={getValue(p.iwould_qty)} hasRun={hasRun} confidence={p.iwould_qty?.confidence} rationale={p.iwould_qty?.rationale} icon={BarChart3} type="number" recalcGeneration={recalcGen} />
              
              <div style={{ fontSize: "8px", color: "#7a8599", padding: "3px 0", fontWeight: 600, marginTop: "6px" }}>DYNAMIC LIMITS</div>
              <CompactField label="Lim Option" value={getValue(p.limit_option)} options={["Order Limit", "Primary Best Bid", "Primary Best Ask", "VWAP", "Midpoint"]} hasRun={hasRun} confidence={p.limit_option?.confidence} rationale={p.limit_option?.rationale} icon={SlidersHorizontal} recalcGeneration={recalcGen} />
              <CompactField label="Lim Offset" value={getValue(p.limit_offset)} hasRun={hasRun} confidence={p.limit_offset?.confidence} rationale={p.limit_offset?.rationale} icon={SlidersHorizontal} type="number" recalcGeneration={recalcGen} />
              <CompactField label="Offset Unit" value={getValue(p.offset_unit)} options={["Tick", "BPS", "Percentage"]} hasRun={hasRun} confidence={p.offset_unit?.confidence} rationale={p.offset_unit?.rationale} icon={SlidersHorizontal} recalcGeneration={recalcGen} />
            </div>
          </div>
          </div>

          {/* Action Bar */}
          {/* {hasRun && (
            <div style={{ padding: "8px", background: "#0a0e1a", borderTop: "1px solid #1a2332", display: "flex", gap: "8px" }}>
              <button onClick={() => alert("Order submitted! (mock)")}
                style={{ flex: 1, padding: "12px", background: "#00d9ff", border: "none", borderRadius: "3px",
                         color: "#000", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex",
                         alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Send size={12} /> SUBMIT ORDER
              </button>
              <button onClick={resetAll}
                style={{ padding: "12px 20px", background: "transparent", border: "1px solid #1a2332",
                         borderRadius: "3px", color: "#7a8599", fontSize: "10px", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}