"""
AUO Backend — Single-file FastAPI server
=========================================
All business logic inlined (no modularization).
Response JSON matches the frontend's mockPrefill() schema exactly.

Run:  uvicorn main:app --reload --port 8000
"""

import os
import json
import time as _time
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pymysql
import pymysql.cursors

# ============================================================
# APP INIT
# ============================================================

app = FastAPI(title="AUO Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# DATABASE CONNECTION
# ============================================================
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": "312531",  # <--- Update this line directly
    "database": os.getenv("DB_NAME", "auo_hackathon"),
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True,
}


def get_db():
    """Return a fresh DB connection (simple approach for MVP)."""
    return pymysql.connect(**DB_CONFIG)


# ============================================================
# PYDANTIC SCHEMAS  (API contracts)
# ============================================================

class PrefillRequest(BaseModel):
    symbol: str
    cpty_id: str
    size: int
    order_notes: str = ""
    time_to_close: Optional[int] = None   # override from slider
    side: Optional[str] = None            # optional user-specified side


class SubmitRequest(BaseModel):
    symbol: str
    cpty_id: str
    size: int
    side: Optional[str] = None
    order_notes: str = ""
    prefilled_params: dict = {}
    trader_overrides: dict = {}


# ============================================================
# HARDCODED BUSINESS CONFIG  (from auo_config.py)
# ============================================================

URGENCY_KEYWORDS_POSITIVE = [
    ("urgent", 10), ("critical", 10), ("immediate", 10),
    ("must complete", 8), ("eod compliance", 8),
    ("rush", 7), ("asap", 7),
]
URGENCY_KEYWORDS_NEGATIVE = [
    ("patient", -5), ("no urgency", -5), ("no rush", -5),
]

CAS_THRESHOLD = 25          # minutes — anything <= this is CAS
CAS_BAND_UPPER = 1.03       # +3 %
CAS_BAND_LOWER = 0.97       # -3 %
TOTAL_TRADING_MINUTES = 390  # 6.5 hours

CROSSING_SIZE_THRESHOLD = 5.0
CROSSING_MIN_PCT = 0.2
CROSSING_MAX_PCT = 0.5

IWOULD_URGENCY_THRESHOLD = 40
IWOULD_PRICE_OFFSET = 0.005
IWOULD_QTY_PCT = 0.3

LIMIT_PEG_URGENCY_THRESHOLD = 80


# ============================================================
# CORE AUO LOGIC — ALL INLINED
# ============================================================

# ---------- helpers ----------

def _field(value, confidence, rationale):
    """Shorthand to build the {value, confidence, rationale} dict the frontend expects."""
    return {"value": value, "confidence": confidence, "rationale": rationale}


# ---------- 1. urgency calculator ----------

def calculate_urgency(order_notes: str, size: int, time_to_close: int,
                      avg_trade_size: int, urgency_factor: float) -> dict:
    """
    Urgency = Time(40) + Size(30) + Client(20) + Notes(10)
    Returns dict with urgency_score, classification, breakdown.
    """
    # Time pressure (40 pts max)
    if time_to_close <= CAS_THRESHOLD:
        time_score = 40.0
    else:
        time_score = (1 - time_to_close / TOTAL_TRADING_MINUTES) * 40

    # Size pressure (30 pts max)
    size_ratio = size / max(avg_trade_size, 1)
    if size_ratio > 20:
        size_score = 30.0
    elif size_ratio > 10:
        size_score = 25.0
    elif size_ratio > 5:
        size_score = 20.0
    else:
        size_score = size_ratio * 3

    # Client factor (20 pts max)
    client_score = urgency_factor * 20

    # Notes urgency (10 pts max)
    notes_lower = order_notes.lower()
    notes_score = 0
    for kw, pts in URGENCY_KEYWORDS_POSITIVE:
        if kw in notes_lower:
            notes_score = pts
            break
    if notes_score == 0:
        for kw, pts in URGENCY_KEYWORDS_NEGATIVE:
            if kw in notes_lower:
                notes_score = pts
                break

    raw = time_score + size_score + client_score + notes_score
    score = round(max(0, min(100, raw)))

    if score >= 80:
        classification = "CRITICAL"
    elif score >= 60:
        classification = "HIGH"
    elif score >= 40:
        classification = "MEDIUM"
    else:
        classification = "LOW"

    return {
        "urgency_score": score,
        "urgency_classification": classification,
        "urgency_breakdown": {
            "time_pressure": round(time_score, 1),
            "size_pressure": round(size_score, 1),
            "client_factor": round(client_score, 1),
            "notes_urgency": notes_score,
        },
    }


# ---------- 2. CAS detector ----------

def detect_cas(time_to_close: int, ltp: float) -> dict:
    cas_active = time_to_close <= CAS_THRESHOLD
    if cas_active:
        state = "CAS"
    elif time_to_close <= 60:
        state = "Pre_Close"
    else:
        state = "Continuous"

    upper = round(ltp * CAS_BAND_UPPER, 1)
    lower = round(ltp * CAS_BAND_LOWER, 1)

    return {
        "cas_active": cas_active,
        "market_state": state,
        "reference_price": ltp,
        "upper_band": upper,
        "lower_band": lower,
    }


# ---------- 3. side detection ----------

def detect_side(order_notes: str, user_side: Optional[str]) -> dict:
    if user_side:
        return _field(user_side, "HIGH", "User-specified side")

    nl = order_notes.lower()
    if any(w in nl for w in ("buy", "purchase", "long")):
        return _field("Buy", "HIGH", "Order notes indicate buy instruction")
    if any(w in nl for w in ("sell", "liquidate", "short")):
        return _field("Sell", "HIGH", "Order notes indicate sell instruction")

    return _field(None, "LOW", "Require manual selection")


# ---------- 4. order type ----------

def select_order_type(urgency: int, cas_active: bool,
                      urgency_factor: float, volatility: float) -> tuple:
    """Returns (order_type_field, price_type_field)."""
    if cas_active:
        r = "CAS window detected. Limit order required for auction participation within ±3% band."
        return _field("Limit", "HIGH", r), _field("Limit", "HIGH", "Limit pricing")
    if urgency > 80 and urgency_factor > 0.7:
        r = "High urgency + low price sensitivity → Market order for guaranteed fill"
        return _field("Market", "HIGH", r), _field("Market", "HIGH", "Market pricing")
    if volatility > 2.5:
        r = f"High volatility ({volatility}%) → Limit order to avoid adverse selection"
        return _field("Limit", "HIGH", r), _field("Limit", "HIGH", "Limit pricing")

    return (_field("Limit", "MEDIUM", "Standard limit order for price protection"),
            _field("Limit", "MEDIUM", "Limit pricing"))


# ---------- 5. limit price ----------

def calc_limit_price(side: Optional[str], urgency: int, cas: dict,
                     ltp: float, bid: float, ask: float) -> dict:
    if side is None:
        side = "Buy"  # default for calculation

    if cas["cas_active"]:
        ref = cas["reference_price"]
        ub, lb = cas["upper_band"], cas["lower_band"]
        if side == "Buy":
            mult = 1.008 if urgency > 80 else 1.005
            lim = round(ref * mult, 1)
            lim = min(lim, ub)
            pct = "+0.8%" if urgency > 80 else "+0.5%"
            rat = f"CAS: Aggressive limit at {pct} for high fill probability (Band: {lb} - {ub})"
        else:
            mult = 0.992 if urgency > 80 else 0.995
            lim = round(ref * mult, 1)
            lim = max(lim, lb)
            pct = "-0.8%" if urgency > 80 else "-0.5%"
            rat = f"CAS: Aggressive limit at {pct} for high fill probability (Band: {lb} - {ub})"
        return _field(lim, "HIGH", rat)

    mid = round((bid + ask) / 2, 1)
    if side == "Buy":
        if urgency > 70:
            return _field(ask, "HIGH", "High urgency: Limit at ask price for immediate execution")
        elif urgency > 40:
            return _field(mid, "HIGH", "Medium urgency: Mid-price balances cost and fill probability")
        else:
            return _field(round(bid + 0.1, 1), "HIGH", "Low urgency: Patient limit near bid for better price")
    else:
        if urgency > 70:
            return _field(bid, "HIGH", "High urgency: Limit at bid price for immediate execution")
        elif urgency > 40:
            return _field(mid, "HIGH", "Medium urgency: Mid-price balances cost and fill probability")
        else:
            return _field(round(ask - 0.1, 1), "HIGH", "Low urgency: Patient limit near ask for better price")


# ---------- 6. TIF ----------

def select_tif(urgency: int, cas_active: bool, order_notes: str) -> dict:
    if cas_active:
        return _field("CAS", "HIGH", "CAS session: Order valid only for closing auction window")
    nl = order_notes.lower()
    if urgency > 90 and "immediate" in nl:
        return _field("IOC", "MEDIUM", "Critical urgency: IOC ensures immediate execution attempt")
    return _field("GFD", "HIGH", "Standard day order: Valid until market close")


# ---------- 7. algo selection ----------

def select_algo(urgency: int, cas_active: bool, order_notes: str,
                size_ratio: float) -> dict:
    """Returns dict with value, use_algo, confidence, rationale + service."""
    nl = order_notes.lower()
    if cas_active:
        return {"value": None, "use_algo": False, "service": "Market",
                "confidence": "HIGH",
                "rationale": "CAS window: Direct limit order to closing auction (no algo needed)"}
    if "vwap" in nl:
        return {"value": "VWAP", "use_algo": True, "service": "BlueBox 2",
                "confidence": "HIGH",
                "rationale": "Client explicitly requires VWAP benchmark execution"}
    if "twap" in nl:
        return {"value": "TWAP", "use_algo": True, "service": "BlueBox 2",
                "confidence": "HIGH",
                "rationale": "Client explicitly requires TWAP execution"}
    if urgency > 70 and size_ratio > 3:
        return {"value": "POV", "use_algo": True, "service": "BlueBox 2",
                "confidence": "HIGH",
                "rationale": "High urgency with large order requires aggressive participation (POV)"}
    if size_ratio > 2:
        return {"value": "VWAP", "use_algo": True, "service": "BlueBox 2",
                "confidence": "MEDIUM",
                "rationale": "Standard VWAP execution balances cost and completion"}
    return {"value": None, "use_algo": False, "service": "Market",
            "confidence": "HIGH",
            "rationale": "Small order - direct market execution sufficient"}


# ---------- 8. VWAP params ----------

def build_vwap_params(urgency: int, order_notes: str,
                      time_to_close: int, volatility: float) -> dict:
    nl = order_notes.lower()

    # pricing
    if urgency > 70:
        pricing = _field("Adaptive", "HIGH",
                         "High urgency: Adaptive pricing crosses spread when necessary")
    elif volatility > 2.5:
        pricing = _field("Passive", "HIGH",
                         "High volatility: Passive pricing avoids adverse selection")
    else:
        pricing = _field("Adaptive", "HIGH",
                         "Standard adaptive pricing balances aggression and patience")

    layering = _field("Auto", "HIGH",
                      "Auto-layering optimizes order book placement dynamically")

    # urgency setting
    if urgency > 80:
        urg = _field("High", "HIGH", f"Urgency score: {urgency}/100 → High")
    elif urgency > 50:
        urg = _field("Auto", "HIGH", "Auto urgency adapts to market conditions")
    else:
        urg = _field("Low", "HIGH", "Low urgency allows patient accumulation")

    # get done
    gd = urgency > 75 or "must complete" in nl
    get_done = _field("True" if gd else "False", "HIGH",
                      "Force completion by end time" if gd
                      else "Allow unfilled quantity to remain")

    # opening
    op = time_to_close > 300
    opening_print = _field("True" if op else "False", "HIGH",
                           "Participate in opening auction for early liquidity"
                           if op else "Order entered after open")
    opening_pct = _field(10 if op else 0, "MEDIUM", "Max % in opening auction")

    # closing
    cp = time_to_close < 60
    cp_pct = (30 if urgency > 80 else 20) if cp else 0
    closing_print = _field("True" if cp else "False", "HIGH",
                           "Approaching close - participate in closing auction"
                           if cp else "Sufficient time remaining")
    closing_pct = _field(cp_pct, "MEDIUM", f"Max {cp_pct}% in closing auction")

    return {
        "pricing": pricing,
        "layering": layering,
        "urgency_setting": urg,
        "get_done": get_done,
        "opening_print": opening_print,
        "opening_pct": opening_pct,
        "closing_print": closing_print,
        "closing_pct": closing_pct,
    }


# ---------- 9. crossing ----------

def build_crossing(size: int, size_ratio: float) -> dict:
    enabled = size_ratio > CROSSING_SIZE_THRESHOLD
    if enabled:
        mn = round(size * CROSSING_MIN_PCT)
        mx = round(size * CROSSING_MAX_PCT)
        rat = "Large order: Enable crossing for 20-50% blocks"
    else:
        mn, mx = None, None
        rat = "Not applicable"
    return {
        "min_cross_qty": _field(mn, "MEDIUM", rat if enabled else "Not applicable"),
        "max_cross_qty": _field(mx, "MEDIUM", rat if enabled else "Not applicable"),
        "cross_qty_unit": _field("Shares", "HIGH", "Standard unit"),
        "leave_active_slice": _field("False", "HIGH", "Avoid over-execution during cross"),
    }


# ---------- 10. IWould ----------

def build_iwould(urgency: int, side: Optional[str], size: int, ltp: float) -> dict:
    enabled = urgency < IWOULD_URGENCY_THRESHOLD
    if enabled:
        if (side or "Buy") == "Sell":
            price = round(ltp * (1 + IWOULD_PRICE_OFFSET), 1)
        else:
            price = round(ltp * (1 - IWOULD_PRICE_OFFSET), 1)
        qty = round(size * IWOULD_QTY_PCT)
        return {
            "iwould_price": _field(price, "MEDIUM", "Opportunistic execution price"),
            "iwould_qty": _field(qty, "MEDIUM", "30% of total order"),
        }
    return {
        "iwould_price": _field(None, "MEDIUM", "Not applicable for urgent orders"),
        "iwould_qty": _field(None, "MEDIUM", "Not applicable"),
    }


# ---------- 11. limit adjustment ----------

def build_limit_adjustment(urgency: int, side: Optional[str]) -> dict:
    if urgency >= LIMIT_PEG_URGENCY_THRESHOLD:
        if (side or "Buy") == "Buy":
            opt = "Primary Best Bid"
        else:
            opt = "Primary Best Ask"
        return {
            "limit_option": _field(opt, "MEDIUM", "Peg to best price for aggressive fill"),
            "limit_offset": _field(1, "HIGH", "1 tick offset"),
            "offset_unit": _field("Tick", "HIGH", "Standard tick-based offset"),
        }
    return {
        "limit_option": _field("Order Limit", "HIGH", "Static limit price from order"),
        "limit_offset": _field(0, "HIGH", "No offset"),
        "offset_unit": _field("Tick", "HIGH", "Standard tick-based offset"),
    }


# ============================================================
# MAIN PREFILL ORCHESTRATOR
# ============================================================

def run_prefill(req: PrefillRequest, market: dict, client: dict) -> dict:
    """
    Orchestrates all AUO sub-engines, returns the EXACT JSON shape
    that the frontend expects (mirrors mockPrefill in the .jsx).
    """
    t0 = _time.perf_counter()

    # --- inputs ---
    notes = req.order_notes or ""
    size = req.size
    ttc = req.time_to_close if req.time_to_close is not None else int(market["time_to_close"])
    ltp = float(market["ltp"])
    bid = float(market["bid"])
    ask = float(market["ask"])
    vol = float(market["volatility_pct"])
    avg_ts = int(market["avg_trade_size"])
    uf = float(client["urgency_factor"])
    instrument = {
        "RELIANCE.NS": "RELIANCE INDS T+1",
        "INFY.NS": "INFOSYS LTD T+1",
        "TCS.NS": "TCS LTD T+1",
        "HDFCBANK.NS": "HDFC BANK T+1",
        "ICICIBANK.NS": "ICICI BANK T+1",
        "SBIN.NS": "STATE BANK T+1",
        "BHARTIARTL.NS": "BHARTI AIRTEL T+1",
        "ITC.NS": "ITC LTD T+1",
        "KOTAKBANK.NS": "KOTAK BANK T+1",
        "LT.NS": "LARSEN & TOUBRO T+1",
        "HINDUNILVR.NS": "HINDUSTAN UNILEVER T+1",
        "BAJFINANCE.NS": "BAJAJ FINANCE T+1",
        "MARUTI.NS": "MARUTI SUZUKI T+1",
        "ASIANPAINT.NS": "ASIAN PAINTS T+1",
        "WIPRO.NS": "WIPRO LTD T+1",
    }.get(req.symbol, f"{req.symbol} T+1")

    size_ratio = size / max(avg_ts, 1)

    # --- 1. urgency ---
    urg = calculate_urgency(notes, size, ttc, avg_ts, uf)
    score = urg["urgency_score"]

    # --- 2. CAS ---
    cas = detect_cas(ttc, ltp)

    # --- 3. side ---
    side_field = detect_side(notes, req.side)
    side_val = side_field["value"]  # may be None

    # --- 4. order type + price type ---
    ot, pt = select_order_type(score, cas["cas_active"], uf, vol)

    # --- 5. limit price ---
    lp = calc_limit_price(side_val, score, cas, ltp, bid, ask)

    # --- 6. TIF ---
    tif = select_tif(score, cas["cas_active"], notes)

    # --- 7. algo ---
    algo = select_algo(score, cas["cas_active"], notes, size_ratio)
    use_algo = algo["use_algo"]

    # --- 8. VWAP params (always calculated; frontend shows if use_algo) ---
    vwap = build_vwap_params(score, notes, ttc, vol)

    # --- 9. crossing ---
    cross = build_crossing(size, size_ratio)

    # --- 10. IWould ---
    iw = build_iwould(score, side_val, size, ltp)

    # --- 11. limit adjustment ---
    la = build_limit_adjustment(score, side_val)

    # --- 12. static fields ---
    capacity_val = "Principal" if uf > 0.6 else "Agent"
    capacity_rat = "Standard principal capacity" if uf > 0.6 else "Agency execution model"
    hold_rat = "High urgency - release immediately" if score > 70 else "Standard immediate release"
    today = date.today().isoformat()

    elapsed_ms = round((_time.perf_counter() - t0) * 1000)

    # --- build response (EXACT frontend schema) ---
    prefilled_params = {
        # Tier 1
        "instrument": _field(instrument, "HIGH", "Auto-populated from symbol"),
        "side": side_field,
        "quantity": _field(size, "HIGH", "Quantity from client mandate"),
        # Tier 2
        "order_type": ot,
        "price_type": pt,
        "limit_price": lp,
        "tif": tif,
        "release_date": _field(today, "HIGH", "Immediate execution requested"),
        "hold": _field("No", "HIGH", hold_rat),
        "category": _field("Client", "HIGH", "Client order flow"),
        "capacity": _field(capacity_val, "MEDIUM", capacity_rat),
        "account": _field("UNALLOC", "MEDIUM", "Standard unallocated block order"),
        "service": _field(algo["service"], "HIGH",
                          "Algo engine" if use_algo else "Direct market execution"),
        "executor": _field(algo["value"], algo["confidence"], algo["rationale"]),
        "use_algo": use_algo,
        # VWAP / algo params (frontend reads these regardless)
        "pricing": vwap["pricing"],
        "layering": vwap["layering"],
        "urgency_setting": vwap["urgency_setting"],
        "get_done": vwap["get_done"],
        "opening_print": vwap["opening_print"],
        "opening_pct": vwap["opening_pct"],
        "closing_print": vwap["closing_print"],
        "closing_pct": vwap["closing_pct"],
        # Crossing
        **cross,
        # IWould
        **iw,
        # Limit adjustment
        **la,
    }

    spread_bps = round(((ask - bid) / ltp) * 10000, 1)
    confidence_score = round(0.82 + (score / 500), 2)  # deterministic

    return {
        "urgency_score": score,
        "urgency_classification": urg["urgency_classification"],
        "urgency_breakdown": urg["urgency_breakdown"],
        "prefilled_params": prefilled_params,
        "market_context": {
            "time_to_close": ttc,
            "market_state": cas["market_state"],
            "cas_active": cas["cas_active"],
            "cas_reference_price": cas["reference_price"],
            "cas_upper_band": cas["upper_band"],
            "cas_lower_band": cas["lower_band"],
            "ltp": ltp,
            "bid": bid,
            "ask": ask,
            "volatility": vol,
            "spread_bps": spread_bps,
        },
        "metadata": {
            "auo_version": "1.0.0",
            "processing_time_ms": elapsed_ms,
            "confidence_score": min(confidence_score, 0.99),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }


# ============================================================
# API ROUTES
# ============================================================

# ---------- health ----------

@app.get("/api/health")
def health():
    try:
        conn = get_db()
        conn.ping()
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "healthy", "database": db_status, "version": "1.0.0"}


# ---------- clients ----------

@app.get("/api/clients")
def list_clients():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT cpty_id, client_name, urgency_factor, "
                "price_sensitivity, execution_model FROM client_profiles ORDER BY cpty_id"
            )
            rows = cur.fetchall()
        # Convert Decimal → float for JSON serialization
        for r in rows:
            r["urgency_factor"] = float(r["urgency_factor"])
        return rows
    finally:
        conn.close()


# ---------- market data ----------

@app.get("/api/market/{symbol}")
def get_market(symbol: str):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT symbol, ltp, bid, ask, time_to_close, volatility_pct, avg_trade_size "
                "FROM market_data WHERE symbol = %s ORDER BY snapshot_id DESC LIMIT 1",
                (symbol,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Symbol {symbol} not found")
        # Decimal → float
        for k in ("ltp", "bid", "ask", "volatility_pct"):
            row[k] = float(row[k])
        return row
    finally:
        conn.close()


# ---------- MAIN: prefill ----------

@app.post("/api/prefill")
def prefill(req: PrefillRequest):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Fetch market data
            cur.execute(
                "SELECT symbol, ltp, bid, ask, time_to_close, volatility_pct, avg_trade_size "
                "FROM market_data WHERE symbol = %s ORDER BY snapshot_id DESC LIMIT 1",
                (req.symbol,),
            )
            market = cur.fetchone()
            if not market:
                raise HTTPException(404, f"Symbol {req.symbol} not found in market_data")

            # Fetch client profile
            cur.execute(
                "SELECT cpty_id, client_name, urgency_factor, price_sensitivity, execution_model "
                "FROM client_profiles WHERE cpty_id = %s",
                (req.cpty_id,),
            )
            client = cur.fetchone()
            if not client:
                raise HTTPException(404, f"Client {req.cpty_id} not found in client_profiles")

        # Decimal → float for all numeric fields
        for k in ("ltp", "bid", "ask", "volatility_pct"):
            market[k] = float(market[k])
        client["urgency_factor"] = float(client["urgency_factor"])

        # Run the AUO engine
        result = run_prefill(req, market, client)
        return result

    finally:
        conn.close()


# ---------- submit order ----------

@app.post("/api/orders/submit")
def submit_order(req: SubmitRequest):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO order_data "
                "(symbol, cpty_id, side, size, order_notes, arrival_time, "
                " prefill_result, submitted_params, trader_overrides, "
                " submission_status, submitted_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Submitted', %s)",
                (
                    req.symbol,
                    req.cpty_id,
                    req.side,
                    req.size,
                    req.order_notes,
                    datetime.utcnow(),
                    json.dumps(req.prefilled_params),
                    json.dumps(req.prefilled_params),
                    json.dumps(req.trader_overrides),
                    datetime.utcnow(),
                ),
            )
            order_id = cur.lastrowid
        return {
            "order_id": order_id,
            "status": "submitted",
            "submission_time": datetime.utcnow().isoformat() + "Z",
            "validation_status": "PASSED",
        }
    finally:
        conn.close()


# ---------- get order ----------

@app.get("/api/orders/{order_id}")
def get_order(order_id: int):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM order_data WHERE order_id = %s", (order_id,))
            row = cur.fetchone()
        if not row:
            raise HTTPException(404, f"Order {order_id} not found")
        # Serialize datetimes
        for k, v in row.items():
            if isinstance(v, datetime):
                row[k] = v.isoformat()
        return row
    finally:
        conn.close()


# ---------- update market TTC (for demo slider) ----------

@app.put("/api/market/{symbol}/ttc")
def update_ttc(symbol: str, ttc: int):
    """Let the frontend slider update time_to_close for demo purposes."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE market_data SET time_to_close = %s WHERE symbol = %s",
                (ttc, symbol),
            )
        return {"symbol": symbol, "time_to_close": ttc, "updated": True}
    finally:
        conn.close()


# ============================================================
# ENTRYPOINT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)