"""
test_logic.py — Offline validation of all AUO business logic
=============================================================
Extracts and tests the pure functions from main.py without
needing FastAPI, MySQL, or network.

Run:  python3 test_logic.py
"""

import sys, os, json, time as _time
from datetime import date, datetime
from typing import Optional

# ── Inline the entire business logic (copied from main.py) ──

CAS_THRESHOLD = 25
CAS_BAND_UPPER = 1.03
CAS_BAND_LOWER = 0.97
TOTAL_TRADING_MINUTES = 390
CROSSING_SIZE_THRESHOLD = 5.0
CROSSING_MIN_PCT = 0.2
CROSSING_MAX_PCT = 0.5
IWOULD_URGENCY_THRESHOLD = 40
IWOULD_PRICE_OFFSET = 0.005
IWOULD_QTY_PCT = 0.3
LIMIT_PEG_URGENCY_THRESHOLD = 80

URGENCY_KEYWORDS_POSITIVE = [
    ("urgent", 10), ("critical", 10), ("immediate", 10),
    ("must complete", 8), ("eod compliance", 8),
    ("rush", 7), ("asap", 7),
]
URGENCY_KEYWORDS_NEGATIVE = [
    ("patient", -5), ("no urgency", -5), ("no rush", -5),
]

def _field(value, confidence, rationale):
    return {"value": value, "confidence": confidence, "rationale": rationale}

def calculate_urgency(order_notes, size, time_to_close, avg_trade_size, urgency_factor):
    if time_to_close <= CAS_THRESHOLD:
        time_score = 40.0
    else:
        time_score = (1 - time_to_close / TOTAL_TRADING_MINUTES) * 40
    size_ratio = size / max(avg_trade_size, 1)
    if size_ratio > 20: size_score = 30.0
    elif size_ratio > 10: size_score = 25.0
    elif size_ratio > 5: size_score = 20.0
    else: size_score = size_ratio * 3
    client_score = urgency_factor * 20
    notes_lower = order_notes.lower()
    notes_score = 0
    for kw, pts in URGENCY_KEYWORDS_POSITIVE:
        if kw in notes_lower: notes_score = pts; break
    if notes_score == 0:
        for kw, pts in URGENCY_KEYWORDS_NEGATIVE:
            if kw in notes_lower: notes_score = pts; break
    raw = time_score + size_score + client_score + notes_score
    score = round(max(0, min(100, raw)))
    if score >= 80: cl = "CRITICAL"
    elif score >= 60: cl = "HIGH"
    elif score >= 40: cl = "MEDIUM"
    else: cl = "LOW"
    return {"urgency_score": score, "urgency_classification": cl,
            "urgency_breakdown": {"time_pressure": round(time_score,1),
                                  "size_pressure": round(size_score,1),
                                  "client_factor": round(client_score,1),
                                  "notes_urgency": notes_score}}

def detect_cas(time_to_close, ltp):
    cas_active = time_to_close <= CAS_THRESHOLD
    state = "CAS" if cas_active else ("Pre_Close" if time_to_close <= 60 else "Continuous")
    return {"cas_active": cas_active, "market_state": state,
            "reference_price": ltp,
            "upper_band": round(ltp * CAS_BAND_UPPER, 1),
            "lower_band": round(ltp * CAS_BAND_LOWER, 1)}

def detect_side(order_notes, user_side):
    if user_side: return _field(user_side, "HIGH", "User-specified side")
    nl = order_notes.lower()
    if any(w in nl for w in ("buy","purchase","long")):
        return _field("Buy", "HIGH", "Order notes indicate buy instruction")
    if any(w in nl for w in ("sell","liquidate","short")):
        return _field("Sell", "HIGH", "Order notes indicate sell instruction")
    return _field(None, "LOW", "Require manual selection")

def select_order_type(urgency, cas_active, urgency_factor, volatility):
    if cas_active:
        r = "CAS window detected. Limit order required for auction participation within ±3% band."
        return _field("Limit","HIGH",r), _field("Limit","HIGH","Limit pricing")
    if urgency > 80 and urgency_factor > 0.7:
        r = "High urgency + low price sensitivity → Market order for guaranteed fill"
        return _field("Market","HIGH",r), _field("Market","HIGH","Market pricing")
    return _field("Limit","MEDIUM","Standard limit order for price protection"), _field("Limit","MEDIUM","Limit pricing")

def calc_limit_price(side, urgency, cas, ltp, bid, ask):
    if side is None: side = "Buy"
    if cas["cas_active"]:
        ref = cas["reference_price"]; ub=cas["upper_band"]; lb=cas["lower_band"]
        if side=="Buy":
            mult = 1.008 if urgency>80 else 1.005
            lim = round(ref*mult,1); lim=min(lim,ub)
            pct = "+0.8%" if urgency>80 else "+0.5%"
        else:
            mult = 0.992 if urgency>80 else 0.995
            lim = round(ref*mult,1); lim=max(lim,lb)
            pct = "-0.8%" if urgency>80 else "-0.5%"
        return _field(lim,"HIGH",f"CAS: Aggressive limit at {pct} for high fill probability (Band: {lb} - {ub})")
    mid = round((bid+ask)/2,1)
    if side=="Buy":
        if urgency>70: return _field(ask,"HIGH","High urgency: Limit at ask for immediate execution")
        elif urgency>40: return _field(mid,"HIGH","Medium urgency: Mid-price balances cost and fill probability")
        else: return _field(round(bid+0.1,1),"HIGH","Low urgency: Patient limit near bid")
    else:
        if urgency>70: return _field(bid,"HIGH","High urgency: Limit at bid for immediate execution")
        elif urgency>40: return _field(mid,"HIGH","Medium urgency: Mid-price balances cost and fill probability")
        else: return _field(round(ask-0.1,1),"HIGH","Low urgency: Patient limit near ask")

def select_algo(urgency, cas_active, order_notes, size_ratio):
    nl = order_notes.lower()
    if cas_active: return {"value":None,"use_algo":False,"service":"Market","confidence":"HIGH","rationale":"CAS: no algo"}
    if "vwap" in nl: return {"value":"VWAP","use_algo":True,"service":"BlueBox 2","confidence":"HIGH","rationale":"Client requires VWAP"}
    if "twap" in nl: return {"value":"TWAP","use_algo":True,"service":"BlueBox 2","confidence":"HIGH","rationale":"Client requires TWAP"}
    if urgency>70 and size_ratio>3: return {"value":"POV","use_algo":True,"service":"BlueBox 2","confidence":"HIGH","rationale":"POV for urgent large"}
    if size_ratio>2: return {"value":"VWAP","use_algo":True,"service":"BlueBox 2","confidence":"MEDIUM","rationale":"Standard VWAP"}
    return {"value":None,"use_algo":False,"service":"Market","confidence":"HIGH","rationale":"Direct execution"}


# ── TESTS ──

def test_case1_cas_eod():
    """Problem Statement Case 1: Client_XYZ, 3:05 PM, EOD compliance"""
    print("=" * 60)
    print("TEST CASE 1: CAS EOD Compliance (RELIANCE.NS, Client_XYZ)")
    print("=" * 60)

    notes = "EOD compliance required - must attain position by close"
    size = 50000; ttc = 25
    ltp = 2570.2; bid = 2570.0; ask = 2570.5
    vol = 2.1; avg_ts = 7500; uf = 0.85

    urg = calculate_urgency(notes, size, ttc, avg_ts, uf)
    print(f"  Urgency Score:  {urg['urgency_score']} ({urg['urgency_classification']})")
    print(f"  Breakdown:      {urg['urgency_breakdown']}")
    assert urg["urgency_score"] >= 80, f"Expected CRITICAL, got {urg['urgency_score']}"
    assert urg["urgency_classification"] == "CRITICAL"

    cas = detect_cas(ttc, ltp)
    print(f"  CAS Active:     {cas['cas_active']}  State: {cas['market_state']}")
    print(f"  Band:           {cas['lower_band']} – {cas['upper_band']}")
    assert cas["cas_active"] is True
    assert cas["market_state"] == "CAS"

    side = detect_side(notes, None)
    print(f"  Side:           {side['value']} ({side['confidence']})")
    # Notes don't explicitly say "buy" so this should be LOW/None
    # Actually "attain position" doesn't contain "buy" — correct

    ot, pt = select_order_type(urg["urgency_score"], cas["cas_active"], uf, vol)
    print(f"  Order Type:     {ot['value']} ({ot['confidence']})")
    assert ot["value"] == "Limit", "CAS must use Limit"

    lp = calc_limit_price("Buy", urg["urgency_score"], cas, ltp, bid, ask)
    print(f"  Limit Price:    {lp['value']}")
    assert cas["lower_band"] <= lp["value"] <= cas["upper_band"], "Price outside SEBI band!"

    algo = select_algo(urg["urgency_score"], cas["cas_active"], notes, size/avg_ts)
    print(f"  Algo:           {algo['value']}  use_algo={algo['use_algo']}")
    assert algo["use_algo"] is False, "CAS should not use algo"

    print("  ✅ CASE 1 PASSED\n")


def test_case2_vwap_morning():
    """Problem Statement Case 2: Client_ABC, morning VWAP"""
    print("=" * 60)
    print("TEST CASE 2: VWAP Morning (INFY.NS, Client_ABC)")
    print("=" * 60)

    notes = "VWAP must complete by 2pm - patient execution preferred"
    size = 75000; ttc = 330
    ltp = 1848.6; bid = 1848.0; ask = 1849.0
    vol = 1.4; avg_ts = 12000; uf = 0.50

    urg = calculate_urgency(notes, size, ttc, avg_ts, uf)
    print(f"  Urgency Score:  {urg['urgency_score']} ({urg['urgency_classification']})")
    print(f"  Breakdown:      {urg['urgency_breakdown']}")
    assert 30 <= urg["urgency_score"] <= 60, f"Expected MEDIUM-ish, got {urg['urgency_score']}"

    cas = detect_cas(ttc, ltp)
    print(f"  CAS Active:     {cas['cas_active']}  State: {cas['market_state']}")
    assert cas["cas_active"] is False
    assert cas["market_state"] == "Continuous"

    side = detect_side(notes, None)
    print(f"  Side:           {side['value']} ({side['confidence']})")

    ot, pt = select_order_type(urg["urgency_score"], cas["cas_active"], uf, vol)
    print(f"  Order Type:     {ot['value']}")

    algo = select_algo(urg["urgency_score"], cas["cas_active"], notes, size/avg_ts)
    print(f"  Algo:           {algo['value']}  use_algo={algo['use_algo']}")
    assert algo["use_algo"] is True, "Should use algo"
    assert algo["value"] == "VWAP", "Notes say VWAP"

    lp = calc_limit_price("Buy", urg["urgency_score"], cas, ltp, bid, ask)
    print(f"  Limit Price:    {lp['value']}")

    print("  ✅ CASE 2 PASSED\n")


def test_case3_urgent_large():
    """Case 3: Urgent large order → POV"""
    print("=" * 60)
    print("TEST CASE 3: Urgent Large (HDFCBANK.NS, Client_GHI)")
    print("=" * 60)

    notes = "Urgent buy - critical allocation for fund rebalancing"
    size = 200000; ttc = 60
    ltp = 1720.4; bid = 1720.0; ask = 1720.8
    vol = 1.8; avg_ts = 9000; uf = 0.70

    urg = calculate_urgency(notes, size, ttc, avg_ts, uf)
    print(f"  Urgency Score:  {urg['urgency_score']} ({urg['urgency_classification']})")
    assert urg["urgency_score"] >= 60

    cas = detect_cas(ttc, ltp)
    assert cas["cas_active"] is False

    side = detect_side(notes, None)
    print(f"  Side:           {side['value']} — detected 'buy' in notes")
    assert side["value"] == "Buy"

    algo = select_algo(urg["urgency_score"], cas["cas_active"], notes, size/avg_ts)
    print(f"  Algo:           {algo['value']}  use_algo={algo['use_algo']}")
    # size_ratio = 200000/9000 = 22.2 and urgency > 70 → POV
    assert algo["use_algo"] is True

    lp = calc_limit_price("Buy", urg["urgency_score"], cas, ltp, bid, ask)
    print(f"  Limit Price:    {lp['value']}")

    print("  ✅ CASE 3 PASSED\n")


def test_case4_patient():
    """Case 4: Patient accumulation → low urgency, IWould enabled"""
    print("=" * 60)
    print("TEST CASE 4: Patient (TCS.NS, Client_VWX)")
    print("=" * 60)

    notes = "Patient accumulation - no urgency, optimize price"
    size = 30000; ttc = 300
    ltp = 4120.8; bid = 4120.5; ask = 4121.2
    vol = 1.1; avg_ts = 5000; uf = 0.20

    urg = calculate_urgency(notes, size, ttc, avg_ts, uf)
    print(f"  Urgency Score:  {urg['urgency_score']} ({urg['urgency_classification']})")
    # "no rush" → -5 notes, low client factor
    assert urg["urgency_score"] < 40, f"Expected LOW, got {urg['urgency_score']}"

    iwould_enabled = urg["urgency_score"] < IWOULD_URGENCY_THRESHOLD
    print(f"  IWould Enabled: {iwould_enabled}")
    assert iwould_enabled is True

    print("  ✅ CASE 4 PASSED\n")


def test_edge_sell_cas():
    """Edge: Sell order in CAS window"""
    print("=" * 60)
    print("TEST CASE 5: Sell in CAS (SBIN.NS, Client_STU)")
    print("=" * 60)

    notes = "Must liquidate by close - regulatory requirement"
    size = 100000; ttc = 25
    ltp = 812.3; bid = 812.0; ask = 812.6
    avg_ts = 15000; uf = 0.80

    urg = calculate_urgency(notes, size, ttc, avg_ts, uf)
    print(f"  Urgency Score:  {urg['urgency_score']} ({urg['urgency_classification']})")

    side = detect_side(notes, None)
    print(f"  Side:           {side['value']}")
    assert side["value"] == "Sell", "Should detect 'liquidate' as Sell"

    cas = detect_cas(ttc, ltp)
    lp = calc_limit_price("Sell", urg["urgency_score"], cas, ltp, bid, ask)
    print(f"  Limit Price:    {lp['value']}")
    assert cas["lower_band"] <= lp["value"] <= cas["upper_band"], "Outside SEBI band!"
    assert lp["value"] < ltp, "Sell CAS limit should be below LTP"

    print("  ✅ CASE 5 PASSED\n")


if __name__ == "__main__":
    print("\n🧪 AUO Logic Validation Suite\n")
    test_case1_cas_eod()
    test_case2_vwap_morning()
    test_case3_urgent_large()
    test_case4_patient()
    test_edge_sell_cas()
    print("=" * 60)
    print("🎉 ALL 5 TEST CASES PASSED")
    print("=" * 60)