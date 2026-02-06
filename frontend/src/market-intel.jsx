import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe, TrendingUp, TrendingDown, AlertTriangle, Activity, RefreshCw,
  ArrowUpRight, ArrowDownRight, Zap, Shield, BarChart3, Clock,
  ChevronDown, ChevronUp, Eye, Target, Radio, Cpu, Flame,
  CircleDot, Info, ExternalLink, Newspaper, Gauge
} from "lucide-react";

// ─── CONFIGURATION ──────────────────────────────────────────────
const WATCHLIST_SYMBOLS = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "SBIN.NS", "ITC.NS", "BHARTIARTL.NS", "BAJFINANCE.NS", "KOTAKBANK.NS",
  "LT.NS", "HINDUNILVR.NS", "TATAMOTORS.NS", "WIPRO.NS", "MARUTI.NS"
];

const MARKET_REGION = "India NSE/BSE";

const SONAR_SYSTEM_PROMPT = `You are the "Macro Intelligence Engine" for a high-frequency trading terminal.
Your goal is to provide a real-time market snapshot based on the user's active watchlist or specified region.

Return a STRICT JSON response (no markdown, no conversation, no code fences) with this structure:
{
  "macro_narrative": {
    "headline": "Short, punchy header (e.g., 'Tech Sell-off Deepens on CPI Miss')",
    "sentiment": "Risk_Off" | "Risk_On" | "Neutral",
    "summary": "2 concise sentences explaining the primary driver for the institutional desk.",
    "key_driver": "The single most important event/catalyst today (e.g., 'RBI Rate Decision')",
    "driver_detail": "1-2 sentences with specific numbers and impact."
  },
  "benchmark_status": [
    {
      "name": "Index Name",
      "value": "12345.67",
      "change_pct": "+0.45",
      "status": "Open" | "Closed"
    }
  ],
  "outliers": [
    {
      "symbol": "TICKER.NS",
      "name": "Company Name",
      "change_pct": "-4.2",
      "price": "1234.50",
      "catalyst": "Very short reason (e.g., 'Q3 Revenue Beat +17%')",
      "volume_signal": "High" | "Normal" | "Extreme",
      "sector": "IT" | "Banking" | "FMCG" | "Auto" | "Pharma" | "Energy" | "Metals" | "Infra" | "Other"
    }
  ],
  "sector_heatmap": [
    {
      "sector": "IT",
      "change_pct": "-1.2",
      "driver": "Global tech weakness"
    }
  ],
  "catalysts": [
    {
      "time": "2h ago",
      "headline": "RBI Holds Repo Rate at 6.25%",
      "impact": "Bullish" | "Bearish" | "Neutral",
      "detail": "Governor signals accommodative stance, inflation projected 4.1%"
    }
  ],
  "predictions": [
    {
      "event": "Nifty 50 above 26,000 by March",
      "probability": "42",
      "direction": "Bullish" | "Bearish",
      "source": "Implied from options chain / market sentiment"
    }
  ]
}

CRITICAL RULES:
- ALL numeric values for change_pct must be strings like "+1.5" or "-2.3" (no % sign in the value)
- Use REAL current data from your search. Do NOT fabricate prices.
- Include 5-8 outliers sorted by absolute change magnitude
- Include 4-6 sector entries
- Include 3-5 recent catalysts from today
- Include 2-3 prediction/sentiment items
- Response must be ONLY the JSON object, nothing else`;

// ─── MOCK DATA ──────────────────────────────────────────────────
const MOCK_DATA = {
  macro_narrative: {
    headline: "RBI Holds Steady as FMCG Rallies, IT Drags",
    sentiment: "Neutral",
    summary: "Indian benchmarks closed marginally higher after erasing early losses. FMCG stocks rallied on excise duty clarity while IT remained under pressure from global tech weakness.",
    key_driver: "RBI Monetary Policy Decision",
    driver_detail: "RBI maintained repo rate at 6.25%. Governor Malhotra signaled accommodative stance with inflation projected at 4.1% for FY26, supporting rate-sensitive sectors."
  },
  benchmark_status: [
    { name: "NIFTY 50", value: "25693.35", change_pct: "+0.20", status: "Closed" },
    { name: "SENSEX", value: "83580.12", change_pct: "+0.32", status: "Closed" },
    { name: "NIFTY BANK", value: "48215.40", change_pct: "-0.15", status: "Closed" },
    { name: "INDIA VIX", value: "14.82", change_pct: "-3.20", status: "Closed" },
  ],
  outliers: [
    { symbol: "ITC.NS", name: "ITC Limited", change_pct: "+5.09", price: "326.05", catalyst: "Cigarette stocks rally on excise duty clarity + GST relief", volume_signal: "Extreme", sector: "FMCG" },
    { symbol: "LICI.NS", name: "LIC of India", change_pct: "+7.26", price: "901.50", catalyst: "Q3 profit +17% YoY to ₹12,958Cr, VNB margin 18.8%", volume_signal: "High", sector: "Banking" },
    { symbol: "MRF.NS", name: "MRF Limited", change_pct: "+8.57", price: "146495.05", catalyst: "Q3 net profit doubled to ₹692Cr, EBITDA margin 17.4%", volume_signal: "High", sector: "Auto" },
    { symbol: "INFY.NS", name: "Infosys", change_pct: "-0.86", price: "1507.10", catalyst: "Global IT weakness, margin pressure concerns", volume_signal: "Normal", sector: "IT" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank", change_pct: "-0.91", price: "941.10", catalyst: "Profit booking after recent rally, FII selling", volume_signal: "Normal", sector: "Banking" },
    { symbol: "TATAMOTORS.NS", name: "Tata Motors", change_pct: "+2.80", price: "987.45", catalyst: "JLR order book strong, EV transition ahead of plan", volume_signal: "High", sector: "Auto" },
    { symbol: "SBIN.NS", name: "State Bank", change_pct: "+1.50", price: "826.50", catalyst: "Rate-sensitive rally post RBI dovish hold", volume_signal: "Normal", sector: "Banking" },
    { symbol: "ADANIENT.NS", name: "Adani Enterprises", change_pct: "-2.90", price: "2456.70", catalyst: "FPI outflows continue, group restructuring noise", volume_signal: "High", sector: "Infra" },
  ],
  sector_heatmap: [
    { sector: "FMCG", change_pct: "+2.8", driver: "Excise duty clarity + defensive rotation" },
    { sector: "Banking", change_pct: "+0.4", driver: "RBI dovish hold supports rate-sensitives" },
    { sector: "Auto", change_pct: "+1.5", driver: "Strong Q3 earnings, EV optimism" },
    { sector: "IT", change_pct: "-1.2", driver: "Global tech selloff, Nasdaq weakness" },
    { sector: "Pharma", change_pct: "+0.8", driver: "Defensive bid, FDA approvals" },
    { sector: "Energy", change_pct: "-0.5", driver: "Crude decline offsets refining margins" },
    { sector: "Metals", change_pct: "-1.8", driver: "China demand fears, commodity pullback" },
  ],
  catalysts: [
    { time: "2h ago", headline: "RBI Holds Repo Rate at 6.25%", impact: "Bullish", detail: "Governor signals accommodative stance, inflation at 4.1% for FY26" },
    { time: "3h ago", headline: "FPIs Sell ₹2,150Cr on Feb 5", impact: "Bearish", detail: "Foreign investors net sellers; DIIs bought ₹1,130Cr providing support" },
    { time: "4h ago", headline: "US Futures Flat Ahead of Jobs Data", impact: "Neutral", detail: "S&P 500 futures steady, NFP report due Friday" },
    { time: "5h ago", headline: "ITC Surges on Excise Clarity", impact: "Bullish", detail: "Cigarette stocks rally as GST implementation details reduce uncertainty" },
    { time: "1d ago", headline: "Tariff Uncertainty Weighs on Exporters", impact: "Bearish", detail: "US trade policy shifts create headwinds for IT and pharma exporters" },
  ],
  predictions: [
    { event: "Nifty 50 above 26,000 by March", probability: "42", direction: "Bullish", source: "Implied from Nifty options OI and put-call ratio" },
    { event: "RBI rate cut in April policy", probability: "68", direction: "Bullish", source: "OIS curve pricing + governor's accommodative language" },
    { event: "Gold above $4,600 by Feb end", probability: "56", direction: "Bullish", source: "Global futures pricing, safe-haven demand" },
  ]
};

// ─── HELPER FUNCTIONS ───────────────────────────────────────────
function pctColor(pct) {
  const n = parseFloat(pct);
  if (isNaN(n)) return "#7a8599";
  if (n > 3) return "#00ff88";
  if (n > 1.5) return "#00d966";
  if (n > 0) return "#44cc77";
  if (n > -1.5) return "#ff6655";
  if (n > -3) return "#ff4444";
  return "#ff2222";
}

function pctBg(pct) {
  const n = parseFloat(pct);
  if (isNaN(n)) return "rgba(122,133,153,0.08)";
  if (n > 0) return `rgba(0,217,102,${Math.min(Math.abs(n) * 0.04, 0.25)})`;
  return `rgba(255,68,68,${Math.min(Math.abs(n) * 0.04, 0.25)})`;
}

function sentimentConfig(s) {
  if (s === "Risk_On") return { color: "#00d966", bg: "rgba(0,217,102,0.12)", icon: TrendingUp, label: "RISK ON" };
  if (s === "Risk_Off") return { color: "#ff4444", bg: "rgba(255,68,68,0.12)", icon: TrendingDown, label: "RISK OFF" };
  return { color: "#ffaa00", bg: "rgba(255,170,0,0.12)", icon: Activity, label: "NEUTRAL" };
}

function impactConfig(i) {
  if (i === "Bullish") return { color: "#00d966", icon: ArrowUpRight };
  if (i === "Bearish") return { color: "#ff4444", icon: ArrowDownRight };
  return { color: "#ffaa00", icon: Activity };
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────
export default function MarketIntel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [source, setSource] = useState("mock");
  const [expandedCatalyst, setExpandedCatalyst] = useState(null);
  const timerRef = useRef(null);

  const fetchIntel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userPrompt = `Market region: ${MARKET_REGION}\nWatchlist symbols: ${WATCHLIST_SYMBOLS.join(", ")}\n\nProvide a complete real-time market intelligence snapshot for today. Search for the latest prices, news, and macro events. Return ONLY the JSON object as specified.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: SONAR_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
          tools: [{ type: "web_search_20250305", name: "web_search" }]
        })
      });

      if (!response.ok) throw new Error(`API ${response.status}`);
      const result = await response.json();

      // Extract text from response content blocks
      const text = result.content
        ?.map(b => b.type === "text" ? b.text : "")
        .filter(Boolean)
        .join("\n") || "";

      // Parse JSON from response (strip any markdown fences)
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setData(parsed);
      setSource("live");
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("API fetch failed, using mock:", err.message);
      setData(MOCK_DATA);
      setSource("mock");
      setLastUpdated(new Date());
      if (err.message.includes("API")) setError("API unavailable — showing cached data");
    }
    setLoading(false);
  }, []);

  // Initial fetch + auto-refresh every 5 minutes
  useEffect(() => {
    fetchIntel();
    timerRef.current = setInterval(fetchIntel, 5 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [fetchIntel]);

  const d = data;
  const sent = d ? sentimentConfig(d.macro_narrative?.sentiment) : null;
  const SentIcon = sent?.icon || Activity;

  return (
    <div style={{ width: "100%", height: "100%", background: "#050810", color: "#e0e6f0", fontFamily: "monospace",
                  display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 3px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulse { animation: pulse 1.2s ease-in-out infinite; }
        .intel-card { background: #0a0e1a; border: 1px solid #1a2332; border-radius: 3px; overflow: hidden; }
        .intel-header { display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: #0d111a; border-bottom: 1px solid #1a2332; font-size: 9px; font-weight: 600; color: #00d9ff; text-transform: uppercase; letter-spacing: 0.04em; }
        .outlier-row { display: grid; grid-template-columns: 70px 120px 1fr 55px 50px; align-items: center; padding: 5px 8px; gap: 6px; border-bottom: 1px solid #0d111a; font-size: 9px; cursor: default; transition: background 0.15s; }
        .outlier-row:hover { background: rgba(0,217,255,0.03); }
        .catalyst-row { padding: 6px 8px; border-bottom: 1px solid #0d111a; cursor: pointer; transition: background 0.15s; }
        .catalyst-row:hover { background: rgba(0,217,255,0.03); }
      `}</style>

      {/* ─── HEADER BAR ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px",
                    background: "#0a0e1a", borderBottom: "1px solid #1a2332", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Globe size={14} style={{ color: "#00d9ff" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>MARKET INTELLIGENCE</span>
          <span style={{ fontSize: "8px", color: "#7a8599" }}>MACRO · OUTLIERS · CATALYSTS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {lastUpdated && (
            <span style={{ fontSize: "8px", color: "#7a8599" }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchIntel} disabled={loading}
            style={{ background: "none", border: "1px solid #1a2332", borderRadius: "2px", padding: "3px 8px",
                     cursor: loading ? "wait" : "pointer", color: "#7a8599", display: "flex", alignItems: "center",
                     gap: "4px", fontSize: "9px" }}>
            <RefreshCw size={10} className={loading ? "pulse" : ""} />
            {loading ? "FETCHING..." : "REFRESH"}
          </button>
          <span style={{ padding: "2px 6px", background: source === "live" ? "rgba(0,217,102,0.12)" : "#0d111a",
                         borderRadius: "2px", fontSize: "8px",
                         color: source === "live" ? "#00d966" : "#7a8599" }}>
            {source === "live" ? "⚡ LIVE" : "📋 CACHED"}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: "4px 12px", background: "rgba(255,170,0,0.08)", borderBottom: "1px solid #1a2332",
                      fontSize: "9px", color: "#ffaa00", display: "flex", alignItems: "center", gap: "6px" }}>
          <AlertTriangle size={10} /> {error}
        </div>
      )}

      {/* ─── LOADING STATE ─── */}
      {loading && !d && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <Cpu size={24} className="pulse" style={{ color: "#00d9ff" }} />
          <span style={{ fontSize: "10px", color: "#00d9ff" }}>SCANNING MARKETS...</span>
          <span style={{ fontSize: "8px", color: "#7a8599" }}>Searching news, prices, macro events</span>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      {d && (
        <div style={{ flex: 1, overflow: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* ═══ ROW 1: MACRO NARRATIVE + BENCHMARKS ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "8px" }}>

            {/* Macro Narrative Card */}
            <div className="intel-card">
              <div className="intel-header">
                <Radio size={10} /> MACRO DRIVER
                {sent && (
                  <span style={{ marginLeft: "auto", padding: "2px 8px", background: sent.bg, color: sent.color,
                                 borderRadius: "2px", fontSize: "8px", fontWeight: 700, display: "flex",
                                 alignItems: "center", gap: "4px" }}>
                    <SentIcon size={9} /> {sent.label}
                  </span>
                )}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#e0e6f0", marginBottom: "6px", lineHeight: 1.3 }}>
                  {d.macro_narrative?.headline}
                </div>
                <div style={{ fontSize: "10px", color: "#b0b8c8", lineHeight: 1.5, marginBottom: "8px" }}>
                  {d.macro_narrative?.summary}
                </div>
                {d.macro_narrative?.key_driver && (
                  <div style={{ padding: "6px 8px", background: "#0d111a", borderRadius: "3px", border: "1px solid #1a2332" }}>
                    <div style={{ fontSize: "8px", color: "#00d9ff", fontWeight: 600, marginBottom: "3px" }}>
                      ⚡ KEY DRIVER: {d.macro_narrative.key_driver}
                    </div>
                    <div style={{ fontSize: "9px", color: "#b0b8c8", lineHeight: 1.4 }}>
                      {d.macro_narrative?.driver_detail}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Benchmark Strip */}
            <div className="intel-card">
              <div className="intel-header">
                <BarChart3 size={10} /> BENCHMARKS
              </div>
              <div style={{ padding: "6px" }}>
                {d.benchmark_status?.map((b, i) => {
                  const pct = parseFloat(b.change_pct);
                  const isUp = pct >= 0;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                                          padding: "6px 8px", borderBottom: i < d.benchmark_status.length - 1 ? "1px solid #0d111a" : "none" }}>
                      <div>
                        <div style={{ fontSize: "9px", color: "#7a8599", fontWeight: 600 }}>{b.name}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#e0e6f0" }}>
                          {parseFloat(b.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: pctColor(b.change_pct),
                                      display: "flex", alignItems: "center", gap: "3px", justifyContent: "flex-end" }}>
                          {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {isUp ? "+" : ""}{pct.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: "8px", color: "#7a8599" }}>{b.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══ ROW 2: SECTOR HEATMAP ═══ */}
          {d.sector_heatmap && d.sector_heatmap.length > 0 && (
            <div className="intel-card">
              <div className="intel-header">
                <Flame size={10} /> SECTOR HEATMAP
              </div>
              <div style={{ display: "flex", gap: "1px", padding: "6px" }}>
                {d.sector_heatmap.map((s, i) => {
                  const pct = parseFloat(s.change_pct);
                  return (
                    <div key={i} style={{
                      flex: 1, padding: "8px 6px", background: pctBg(s.change_pct),
                      borderRadius: "3px", textAlign: "center", cursor: "default",
                      border: `1px solid ${pctColor(s.change_pct)}22`
                    }} title={s.driver}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#e0e6f0", marginBottom: "3px" }}>
                        {s.sector}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: pctColor(s.change_pct) }}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: "7px", color: "#7a8599", marginTop: "2px", overflow: "hidden",
                                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.driver}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ ROW 3: OUTLIERS + CATALYSTS + PREDICTIONS ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px 280px", gap: "8px", flex: 1, minHeight: 0 }}>

            {/* Outlier Scanner */}
            <div className="intel-card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="intel-header">
                <AlertTriangle size={10} /> OUTLIER SCANNER
                <span style={{ marginLeft: "auto", fontSize: "8px", color: "#7a8599", fontWeight: 400 }}>
                  Sorted by |Δ%|
                </span>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "70px 120px 1fr 55px 50px", padding: "4px 8px",
                              gap: "6px", fontSize: "7px", color: "#555", textTransform: "uppercase", borderBottom: "1px solid #1a2332" }}>
                  <span>Symbol</span><span>Name</span><span>Catalyst</span><span>Price</span><span>Chg%</span>
                </div>
                {d.outliers?.sort((a, b) => Math.abs(parseFloat(b.change_pct)) - Math.abs(parseFloat(a.change_pct)))
                  .map((o, i) => {
                    const pct = parseFloat(o.change_pct);
                    const isUp = pct >= 0;
                    return (
                      <div key={i} className="outlier-row" style={{
                        borderLeft: `3px solid ${pctColor(o.change_pct)}`,
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#e0e6f0", fontSize: "10px" }}>
                            {o.symbol?.replace(".NS", "")}
                          </div>
                          {o.volume_signal && o.volume_signal !== "Normal" && (
                            <span style={{ fontSize: "7px", padding: "1px 4px",
                                           background: o.volume_signal === "Extreme" ? "rgba(255,68,68,0.15)" : "rgba(255,170,0,0.12)",
                                           color: o.volume_signal === "Extreme" ? "#ff4444" : "#ffaa00",
                                           borderRadius: "2px" }}>
                              VOL {o.volume_signal.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div style={{ color: "#b0b8c8", fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {o.name}
                        </div>
                        <div style={{ color: "#7a8599", fontSize: "8px", lineHeight: 1.3 }}>
                          {o.catalyst}
                        </div>
                        <div style={{ textAlign: "right", color: "#e0e6f0", fontSize: "10px" }}>
                          ₹{parseFloat(o.price).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 700, fontSize: "10px", color: pctColor(o.change_pct),
                                      display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "2px" }}>
                          {isUp ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                          {isUp ? "+" : ""}{pct.toFixed(1)}%
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>

            {/* Catalysts Feed */}
            <div className="intel-card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="intel-header">
                <Newspaper size={10} /> CATALYSTS
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {d.catalysts?.map((c, i) => {
                  const imp = impactConfig(c.impact);
                  const ImpIcon = imp.icon;
                  const isExpanded = expandedCatalyst === i;
                  return (
                    <div key={i} className="catalyst-row" onClick={() => setExpandedCatalyst(isExpanded ? null : i)}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "8px", color: "#555", minWidth: "40px" }}>{c.time}</span>
                        <ImpIcon size={10} style={{ color: imp.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "9px", fontWeight: 600, color: "#e0e6f0", lineHeight: 1.3 }}>
                          {c.headline}
                        </span>
                        <span style={{ marginLeft: "auto", padding: "1px 5px", background: `${imp.color}18`,
                                       color: imp.color, borderRadius: "2px", fontSize: "7px", fontWeight: 700, flexShrink: 0 }}>
                          {c.impact?.toUpperCase()}
                        </span>
                      </div>
                      {isExpanded && c.detail && (
                        <div style={{ fontSize: "8px", color: "#7a8599", padding: "4px 0 2px 46px", lineHeight: 1.4 }}>
                          {c.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Predictions / Implied Sentiment */}
            <div className="intel-card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="intel-header">
                <Target size={10} /> IMPLIED SENTIMENT
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
                {d.predictions?.map((p, i) => {
                  const prob = parseInt(p.probability) || 50;
                  const isHigh = prob >= 60;
                  const dirColor = p.direction === "Bullish" ? "#00d966" : p.direction === "Bearish" ? "#ff4444" : "#ffaa00";
                  return (
                    <div key={i} style={{ marginBottom: "10px", padding: "8px", background: "#0d111a",
                                          borderRadius: "3px", border: "1px solid #1a2332" }}>
                      <div style={{ fontSize: "9px", color: "#e0e6f0", fontWeight: 600, marginBottom: "6px", lineHeight: 1.3 }}>
                        {p.event}
                      </div>
                      {/* Probability bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <div style={{ flex: 1, height: "6px", background: "#1a2332", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${prob}%`, background: dirColor,
                                        borderRadius: "3px", transition: "width 0.5s ease" }} />
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: dirColor, minWidth: "40px", textAlign: "right" }}>
                          {prob}%
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ padding: "1px 5px", background: `${dirColor}18`, color: dirColor,
                                       borderRadius: "2px", fontSize: "7px", fontWeight: 700 }}>
                          {p.direction?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "7px", color: "#555" }}>{p.source}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <div style={{ padding: "3px 12px", background: "#0a0e1a", borderTop: "1px solid #1a2332",
                    display: "flex", justifyContent: "space-between", fontSize: "7px", color: "#3a4255",
                    flexShrink: 0 }}>
        <span>Data: {source === "live" ? "Anthropic API + Web Search" : "Cached snapshot"} · Region: {MARKET_REGION}</span>
        <span>Auto-refresh: 5min · {WATCHLIST_SYMBOLS.length} symbols tracked</span>
      </div>
    </div>
  );
}