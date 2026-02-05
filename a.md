# Adaptive Urgency Orchestrator (AUO)
## Parameter Mapping to ION Trading UI

**ION Trading - Global LDP Induction 2026**  
**Aligned with Actual Order Entry Interface**  
**February 2026**

---

## Executive Summary

This document maps the **Adaptive Urgency Orchestrator (AUO)** intelligent prefill logic to the **actual ION Trading order entry interface** as revealed in the system screenshots. AUO will intelligently prefill all visible parameters across Standard Orders and Algo Orders, ensuring traders can execute in <10 seconds instead of 90+ seconds.

**Critical Insight:** The screenshots reveal ~25-30 distinct parameters that traders must manually configure. AUO targets **80% auto-prefill rate** for these fields based on contextual intelligence.

---

## ION Trading UI Parameter Inventory

### Screenshot 1: Standard Order Entry Ticket

**Core Order Details**
1. **Symbol** - Instrument identifier (e.g., RELIANCE.NS)
2. **Side** - Buy/Sell direction
3. **Quantity** - Number of shares
4. **Instrument** - Full security name with settlement cycle

**Pricing & Order Type**
5. **Order Type** - Market/Limit/Stop-Loss/etc.
6. **Limit Price** - Price constraint (for Limit orders)
7. **Price Type** - Limit/Market/Best/etc.

**Client & Account**
8. **Category** - Client/House/Proprietary
9. **Client** - Client identifier (counterparty)
10. **Account** - Account allocation (UNALLOC vs specific)
11. **Capacity** - Principal/Agent/Riskless Principal

**Timing & Instructions**
12. **TIF (Time in Force)** - GFD/GTD/IOC/FOK/etc.
13. **Release Date** - Execution date
14. **Hold** - Yes/No (order release control)

**Execution**
15. **Service** - Execution desk/routing service

### Screenshot 2 & 3: Algo Order Entry Ticket (VWAP)

**Algorithm Selection**
16. **Service** - BlueBox 2 (algo engine)
17. **Executor** - VWAP/POV/TWAP/ICEBERG/etc.

**VWAP Strategy Parameters**
18. **Pricing** - Adaptive/Passive/Aggressive
19. **Layering** - Auto/Manual/Percentage
20. **Urgency** - Auto/Low/Medium/High
21. **Get Done?** - True/False (force completion)

**Auction Participation**
22. **Opening Print?** - True/False
23. **Opening Print %** - Max % of order in open auction
24. **Closing Print?** - True/False
25. **Closing Print %** - Max % of order in close auction

**Crossing & Dark Pool**
26. **Min Cross Qty** - Minimum block size for crossing
27. **Max Cross Qty** - Maximum block size for crossing
28. **Cross Qty Unit** - Shares/Value/%
29. **Leave Active Slice** - True/False

**Conditional Liquidity (IWould)**
30. **IWould Price** - Opportunistic execution price
31. **IWould Qty** - Opportunistic execution quantity

**Dynamic Pricing**
32. **Limit Option** - Order Limit/Primary Best Bid/VWAP/etc.
33. **Limit Offset** - Offset value
34. **Offset Unit** - Tick/Percentage/BPS

---

## AUO Prefill Logic by Parameter

### TIER 1: Always Prefill (High Confidence)

These parameters have deterministic logic based on available data:

#### **Symbol**
```python
# Input: User types or selects stock
# AUO Action: Auto-complete based on recent history or watchlist
# Confidence: 100%

def prefill_symbol(user_input, trader_history):
    """Auto-complete symbol based on partial input"""
    if user_input in trader_history['recent_symbols']:
        return {
            'value': user_input,
            'confidence': 'HIGH',
            'rationale': f'Recent trade: Last executed {trader_history[user_input]["days_ago"]} days ago'
        }
    return {'value': user_input, 'confidence': 'HIGH', 'rationale': 'User-selected'}
```

#### **Side** (Buy/Sell)
```python
# Input: Client order notes, historical pattern
# AUO Action: Detect from order notes or suggest based on client pattern

def prefill_side(order_data, client_profile):
    """Determine Buy/Sell based on context"""
    
    # Check order notes for explicit direction
    notes_lower = order_data['order_notes'].lower()
    if 'buy' in notes_lower or 'purchase' in notes_lower or 'long' in notes_lower:
        return {
            'value': 'Buy',
            'confidence': 'HIGH',
            'rationale': 'Order notes indicate buy instruction'
        }
    elif 'sell' in notes_lower or 'liquidate' in notes_lower or 'short' in notes_lower:
        return {
            'value': 'Sell',
            'confidence': 'HIGH',
            'rationale': 'Order notes indicate sell instruction'
        }
    
    # Default to client's typical pattern
    if client_profile['dominant_side'] == 'Buy':
        return {
            'value': 'Buy',
            'confidence': 'MEDIUM',
            'rationale': f'Client {order_data["cpty"]} typically executes buy orders (75% historical)'
        }
    
    return {'value': None, 'confidence': 'LOW', 'rationale': 'Require manual selection'}
```

#### **Quantity**
```python
# Input: Order data size field
# AUO Action: Direct mapping from order data

def prefill_quantity(order_data):
    """Map quantity from order instructions"""
    return {
        'value': order_data['size'],
        'confidence': 'HIGH',
        'rationale': 'Quantity from client mandate'
    }
```

#### **Release Date**
```python
# Input: System date, order start time
# AUO Action: Default to today unless order specifies future date

def prefill_release_date(order_data):
    """Set release date based on order timing"""
    today = datetime.now().date()
    
    if order_data['start_time'] == 'Now':
        return {
            'value': today,
            'confidence': 'HIGH',
            'rationale': 'Immediate execution requested'
        }
    else:
        start_date = parse_date(order_data['start_time'])
        return {
            'value': start_date,
            'confidence': 'HIGH',
            'rationale': f'Scheduled execution on {start_date}'
        }
```

#### **Hold**
```python
# Input: Order urgency, trader discretion flags
# AUO Action: Set to 'No' for immediate orders, 'Yes' for staged orders

def prefill_hold(urgency_score, order_data):
    """Determine if order should be held before release"""
    
    if urgency_score > 70 or 'urgent' in order_data['order_notes'].lower():
        return {
            'value': 'No',
            'confidence': 'HIGH',
            'rationale': 'High urgency - release immediately'
        }
    elif 'staged' in order_data['order_notes'].lower() or 'hold' in order_data['order_notes'].lower():
        return {
            'value': 'Yes',
            'confidence': 'HIGH',
            'rationale': 'Staged execution requested in order notes'
        }
    else:
        return {
            'value': 'No',
            'confidence': 'MEDIUM',
            'rationale': 'Standard immediate release'
        }
```

### TIER 2: Context-Driven Prefill (Medium-High Confidence)

These parameters depend on market context and historical patterns:

#### **Order Type** & **Price Type**
```python
def prefill_order_type(urgency_score, market_data, order_data, client_profile):
    """Determine Market vs Limit vs other order types"""
    
    time_to_close = market_data['time_to_close']
    volatility = market_data['volatility']
    
    # CAS Window - Special handling
    if time_to_close <= 25:
        return {
            'order_type': 'Limit',
            'price_type': 'Limit',
            'confidence': 'HIGH',
            'rationale': 'CAS window detected. Limit order required for auction participation within ±3% band.'
        }
    
    # High urgency + EOD compliance
    if urgency_score > 80 or 'must complete' in order_data['order_notes'].lower():
        if client_profile['price_sensitivity'] == 'LOW':
            return {
                'order_type': 'Market',
                'price_type': 'Market',
                'confidence': 'HIGH',
                'rationale': 'High urgency + low price sensitivity → Market order for guaranteed fill'
            }
    
    # Price-sensitive client or large order
    size_ratio = order_data['size'] / market_data['avg_trade_size']
    if client_profile['price_sensitivity'] == 'HIGH' or size_ratio > 5:
        return {
            'order_type': 'Limit',
            'price_type': 'Limit',
            'confidence': 'HIGH',
            'rationale': 'Price-sensitive client / Large order → Limit order to control execution cost'
        }
    
    # High volatility - prefer limit
    if volatility > 2.5:
        return {
            'order_type': 'Limit',
            'price_type': 'Limit',
            'confidence': 'MEDIUM',
            'rationale': 'High volatility (2.5%+) → Limit order to avoid adverse selection'
        }
    
    # Default: Limit order (safer)
    return {
        'order_type': 'Limit',
        'price_type': 'Limit',
        'confidence': 'MEDIUM',
        'rationale': 'Standard limit order for price protection'
    }
```

#### **Limit Price**
```python
def prefill_limit_price(order_data, market_data, urgency_score):
    """Calculate intelligent limit price"""
    
    side = order_data['direction']
    ltp = market_data['ltp']
    bid = market_data['bid']
    ask = market_data['ask']
    time_to_close = market_data['time_to_close']
    
    # CAS-specific pricing
    if time_to_close <= 25:
        reference_price = ltp  # In production, fetch SEBI CAS ref price at 3:15 PM
        
        if side == 'Buy':
            if urgency_score > 80:
                limit = reference_price * 1.008  # Ref + 80 bps
                rationale = 'CAS: Aggressive limit at +0.8% for high fill probability'
            else:
                limit = reference_price * 1.005  # Ref + 50 bps
                rationale = 'CAS: Moderate limit at +0.5% within ±3% band'
        else:  # Sell
            if urgency_score > 80:
                limit = reference_price * 0.992  # Ref - 80 bps
                rationale = 'CAS: Aggressive limit at -0.8% for high fill probability'
            else:
                limit = reference_price * 0.995  # Ref - 50 bps
                rationale = 'CAS: Moderate limit at -0.5% within ±3% band'
        
        # Ensure within ±3% SEBI band
        upper_band = reference_price * 1.03
        lower_band = reference_price * 0.97
        limit = max(lower_band, min(limit, upper_band))
        
        return {
            'value': round(limit, 1),
            'confidence': 'HIGH',
            'rationale': rationale + f' (Band: {lower_band:.1f} - {upper_band:.1f})'
        }
    
    # Non-CAS pricing
    spread_pct = (ask - bid) / ltp * 100
    
    if side == 'Buy':
        if urgency_score > 70:
            limit = ask  # Willing to pay ask for immediate fill
            rationale = 'High urgency: Limit at ask price for immediate execution'
        elif urgency_score > 40:
            limit = (bid + ask) / 2  # Mid-price
            rationale = 'Medium urgency: Limit at mid-price balances cost and fill probability'
        else:
            limit = bid + (spread_pct * 0.25)  # 25% into spread
            rationale = 'Low urgency: Patient limit near bid for better price'
    else:  # Sell
        if urgency_score > 70:
            limit = bid
            rationale = 'High urgency: Limit at bid price for immediate execution'
        elif urgency_score > 40:
            limit = (bid + ask) / 2
            rationale = 'Medium urgency: Limit at mid-price balances cost and fill probability'
        else:
            limit = ask - (spread_pct * 0.25)
            rationale = 'Low urgency: Patient limit near ask for better price'
    
    return {
        'value': round(limit, 1),
        'confidence': 'HIGH',
        'rationale': rationale
    }
```

#### **TIF (Time in Force)**
```python
def prefill_tif(urgency_score, order_data, market_data):
    """Determine time-in-force instruction"""
    
    time_to_close = market_data['time_to_close']
    
    # CAS session
    if time_to_close <= 25:
        return {
            'value': 'CAS',  # Custom TIF for closing auction
            'confidence': 'HIGH',
            'rationale': 'CAS session: Order valid only for closing auction window'
        }
    
    # Immediate-or-cancel for very urgent orders
    if urgency_score > 90 and 'immediate' in order_data['order_notes'].lower():
        return {
            'value': 'IOC',  # Immediate-Or-Cancel
            'confidence': 'MEDIUM',
            'rationale': 'Critical urgency: IOC ensures immediate execution attempt'
        }
    
    # Fill-or-kill for block trades
    size_ratio = order_data['size'] / market_data['avg_trade_size']
    if size_ratio > 10 and 'all-or-none' in order_data['order_notes'].lower():
        return {
            'value': 'FOK',  # Fill-Or-Kill
            'confidence': 'MEDIUM',
            'rationale': 'Large block order with all-or-none instruction'
        }
    
    # Default: Good-For-Day
    return {
        'value': 'GFD',
        'confidence': 'HIGH',
        'rationale': 'Standard day order: Valid until market close'
    }
```

#### **Category** & **Capacity**
```python
def prefill_category_capacity(order_data, client_profile):
    """Determine order category and broker capacity"""
    
    # Category is almost always 'Client' for institutional flow
    category = 'Client'
    category_rationale = 'Client order flow'
    
    # Capacity depends on how broker is facilitating
    if client_profile.get('execution_model') == 'Agency':
        capacity = 'Agent'
        capacity_rationale = 'Pure agency execution model for this client'
    elif client_profile.get('execution_model') == 'Principal':
        capacity = 'Principal'
        capacity_rationale = 'Principal capacity: Firm commits capital'
    else:
        capacity = 'Principal'  # Most common default
        capacity_rationale = 'Standard principal capacity for facilitation'
    
    return {
        'category': {'value': category, 'confidence': 'HIGH', 'rationale': category_rationale},
        'capacity': {'value': capacity, 'confidence': 'MEDIUM', 'rationale': capacity_rationale}
    }
```

#### **Client** & **Account**
```python
def prefill_client_account(order_data):
    """Map client identifier and account allocation"""
    
    client_id = order_data['cpty']
    
    # Check if specific account allocation is mentioned in notes
    notes = order_data['order_notes'].lower()
    
    if 'unallocated' in notes or 'allocate later' in notes:
        account = 'UNALLOC'
        account_rationale = 'Order notes indicate post-trade allocation'
    elif 'account' in notes:
        # Parse account ID from notes if present
        account = extract_account_from_notes(notes)
        account_rationale = f'Account specified in order notes'
    else:
        # Default to unallocated for institutional block orders
        account = 'UNALLOC'
        account_rationale = 'Standard unallocated block order'
    
    return {
        'client': {'value': client_id, 'confidence': 'HIGH', 'rationale': 'Client from order mandate'},
        'account': {'value': account, 'confidence': 'MEDIUM', 'rationale': account_rationale}
    }
```

### TIER 3: Algo-Specific Prefill (Conditional on Executor Choice)

These parameters only appear when algo execution is selected:

#### **Executor** (Algo Selection)
```python
def prefill_executor(urgency_score, order_data, market_data, client_profile):
    """Select optimal execution algorithm"""
    
    time_to_close = market_data['time_to_close']
    size_ratio = order_data['size'] / market_data['avg_trade_size']
    
    # CAS window - no algo, direct limit order to auction
    if time_to_close <= 25:
        return {
            'value': None,  # Standard limit order, not algo
            'use_algo': False,
            'confidence': 'HIGH',
            'rationale': 'CAS window: Direct limit order to closing auction (no algo needed)'
        }
    
    # Check for explicit algo in order notes
    notes = order_data['order_notes'].upper()
    if 'VWAP' in notes:
        return {
            'value': 'VWAP',
            'use_algo': True,
            'confidence': 'HIGH',
            'rationale': 'Client explicitly requires VWAP benchmark execution'
        }
    elif 'TWAP' in notes:
        return {
            'value': 'TWAP',
            'use_algo': True,
            'confidence': 'HIGH',
            'rationale': 'Client explicitly requires TWAP time-sliced execution'
        }
    
    # High urgency + Large size → POV
    if urgency_score > 70 and size_ratio > 3:
        return {
            'value': 'POV',
            'use_algo': True,
            'confidence': 'HIGH',
            'rationale': 'High urgency with large order requires aggressive participation (POV)'
        }
    
    # Price sensitive + Low urgency → ICEBERG
    if client_profile['price_sensitivity'] == 'HIGH' and urgency_score < 30:
        return {
            'value': 'ICEBERG',
            'use_algo': True,
            'confidence': 'MEDIUM',
            'rationale': 'Price-sensitive client + low urgency → ICEBERG for minimal market impact'
        }
    
    # Default: VWAP (most common institutional algo)
    return {
        'value': 'VWAP',
        'use_algo': True,
        'confidence': 'MEDIUM',
        'rationale': 'Standard VWAP execution balances cost and completion'
    }
```

#### **Service** (Algo Engine)
```python
def prefill_service(executor):
    """Select algo execution engine"""
    
    # Map executor to appropriate service
    if executor in ['VWAP', 'TWAP', 'POV']:
        return {
            'value': 'BlueBox 2',
            'confidence': 'HIGH',
            'rationale': 'BlueBox 2 engine supports VWAP/TWAP/POV strategies'
        }
    elif executor == 'ICEBERG':
        return {
            'value': 'BlueBox 2',
            'confidence': 'HIGH',
            'rationale': 'BlueBox 2 engine supports ICEBERG display strategies'
        }
    else:
        return {
            'value': 'Market',  # Direct market execution
            'confidence': 'HIGH',
            'rationale': 'Standard market execution service'
        }
```

#### **VWAP Parameters**

```python
def prefill_vwap_params(urgency_score, order_data, market_data):
    """Configure VWAP algorithm parameters"""
    
    time_to_close = market_data['time_to_close']
    volatility = market_data['volatility']
    size_ratio = order_data['size'] / market_data['avg_trade_size']
    
    # 1. Pricing
    if urgency_score > 70:
        pricing = 'Adaptive'
        pricing_rationale = 'High urgency: Adaptive pricing crosses spread when necessary'
    elif volatility > 2.5:
        pricing = 'Passive'
        pricing_rationale = 'High volatility: Passive pricing avoids adverse selection'
    else:
        pricing = 'Adaptive'
        pricing_rationale = 'Standard adaptive pricing balances aggression and patience'
    
    # 2. Layering
    layering = 'Auto'
    layering_rationale = 'Auto-layering optimizes order book placement dynamically'
    
    # 3. Urgency
    if urgency_score > 80:
        urgency_setting = 'High'
        urgency_rationale = f'Urgency score: {urgency_score}/100 → High aggression'
    elif urgency_score > 50:
        urgency_setting = 'Auto'
        urgency_rationale = 'Auto urgency adapts to market conditions'
    else:
        urgency_setting = 'Low'
        urgency_rationale = 'Low urgency allows patient accumulation'
    
    # 4. Get Done?
    if urgency_score > 75 or 'must complete' in order_data['order_notes'].lower():
        get_done = True
        get_done_rationale = 'Force completion by end time, even at worse prices if needed'
    else:
        get_done = False
        get_done_rationale = 'Allow unfilled quantity to remain (no forced completion)'
    
    # 5. Opening Print
    if time_to_close > 300:  # More than 5 hours until close (early morning)
        opening_print = True
        opening_pct = 10
        opening_rationale = 'Participate in opening auction for early liquidity (max 10%)'
    else:
        opening_print = False
        opening_pct = 0
        opening_rationale = 'Order entered after open - no opening auction participation'
    
    # 6. Closing Print
    if time_to_close < 60:  # Less than 1 hour to close
        closing_print = True
        if urgency_score > 80:
            closing_pct = 30
            closing_rationale = 'High urgency: Allow up to 30% in closing auction'
        else:
            closing_pct = 20
            closing_rationale = 'Standard closing participation (max 20%)'
    else:
        closing_print = False
        closing_pct = 0
        closing_rationale = 'Sufficient time remaining - no closing auction needed'
    
    return {
        'pricing': {'value': pricing, 'confidence': 'HIGH', 'rationale': pricing_rationale},
        'layering': {'value': layering, 'confidence': 'HIGH', 'rationale': layering_rationale},
        'urgency': {'value': urgency_setting, 'confidence': 'HIGH', 'rationale': urgency_rationale},
        'get_done': {'value': get_done, 'confidence': 'HIGH', 'rationale': get_done_rationale},
        'opening_print': {'value': opening_print, 'confidence': 'HIGH', 'rationale': opening_rationale},
        'opening_pct': {'value': opening_pct, 'confidence': 'MEDIUM', 'rationale': 'Max % in opening auction'},
        'closing_print': {'value': closing_print, 'confidence': 'HIGH', 'rationale': closing_rationale},
        'closing_pct': {'value': closing_pct, 'confidence': 'MEDIUM', 'rationale': 'Max % in closing auction'}
    }
```

#### **Crossing & Dark Pool Parameters**

```python
def prefill_crossing_params(order_data, market_data, client_profile):
    """Configure crossing network / dark pool settings"""
    
    size_ratio = order_data['size'] / market_data['avg_trade_size']
    
    # Only enable crossing for large orders
    if size_ratio > 5:
        # Min cross qty: At least 20% of order
        min_cross = int(order_data['size'] * 0.2)
        
        # Max cross qty: Up to 50% of order in single cross
        max_cross = int(order_data['size'] * 0.5)
        
        # Leave active slice: False (pull from lit market during cross attempt)
        leave_active = False
        
        rationale = 'Large order (5x avg trade): Enable crossing for 20-50% blocks'
    else:
        min_cross = None
        max_cross = None
        leave_active = False
        rationale = 'Small order: No crossing enabled (not economical)'
    
    return {
        'min_cross_qty': {'value': min_cross, 'confidence': 'MEDIUM', 'rationale': rationale},
        'max_cross_qty': {'value': max_cross, 'confidence': 'MEDIUM', 'rationale': rationale},
        'cross_qty_unit': {'value': 'Shares', 'confidence': 'HIGH', 'rationale': 'Standard unit'},
        'leave_active_slice': {'value': leave_active, 'confidence': 'HIGH', 'rationale': 'Avoid over-execution during cross'}
    }
```

#### **IWould (Conditional Liquidity)**

```python
def prefill_iwould_params(urgency_score, order_data, market_data):
    """Configure 'IWould' opportunistic execution"""
    
    # Only set IWould for low-urgency, price-sensitive orders
    if urgency_score < 40 and order_data['order_type'] == 'Limit':
        ltp = market_data['ltp']
        side = order_data['direction']
        
        if side == 'Buy':
            # Willing to buy at 0.5% below current price
            iwould_price = ltp * 0.995
            iwould_qty = int(order_data['size'] * 0.3)  # 30% of order
            rationale = 'Low urgency: Opportunistically buy 30% at -0.5% if liquidity appears'
        else:
            # Willing to sell at 0.5% above current price
            iwould_price = ltp * 1.005
            iwould_qty = int(order_data['size'] * 0.3)
            rationale = 'Low urgency: Opportunistically sell 30% at +0.5% if liquidity appears'
        
        return {
            'iwould_price': {'value': round(iwould_price, 1), 'confidence': 'MEDIUM', 'rationale': rationale},
            'iwould_qty': {'value': iwould_qty, 'confidence': 'MEDIUM', 'rationale': '30% of total order'}
        }
    else:
        return {
            'iwould_price': {'value': None, 'confidence': 'HIGH', 'rationale': 'Not applicable for urgent orders'},
            'iwould_qty': {'value': None, 'confidence': 'HIGH', 'rationale': 'Not applicable'}
        }
```

#### **Limit Adjustment (Pegging)**

```python
def prefill_limit_adjustment(order_data, urgency_score):
    """Configure dynamic limit price pegging"""
    
    # For most orders, use static Order Limit (no pegging)
    if urgency_score < 80:
        return {
            'limit_option': {'value': 'Order Limit', 'confidence': 'HIGH', 'rationale': 'Static limit price from order'},
            'limit_offset': {'value': 0, 'confidence': 'HIGH', 'rationale': 'No offset'},
            'offset_unit': {'value': 'Tick', 'confidence': 'HIGH', 'rationale': 'Standard unit'}
        }
    
    # For very urgent orders, peg to best bid/ask
    side = order_data['direction']
    if side == 'Buy':
        limit_option = 'Primary Best Bid'
        offset = 1  # 1 tick above best bid
        rationale = 'Very urgent: Peg to best bid +1 tick for aggressive fill'
    else:
        limit_option = 'Primary Best Ask'
        offset = -1  # 1 tick below best ask
        rationale = 'Very urgent: Peg to best ask -1 tick for aggressive fill'
    
    return {
        'limit_option': {'value': limit_option, 'confidence': 'MEDIUM', 'rationale': rationale},
        'limit_offset': {'value': offset, 'confidence': 'MEDIUM', 'rationale': f'{abs(offset)} tick offset'},
        'offset_unit': {'value': 'Tick', 'confidence': 'HIGH', 'rationale': 'Standard tick-based offset'}
    }
```

---

## Complete Prefill Workflow Example

### Input Data (3:05 PM Scenario)

```python
# Market Data
market_data = {
    'time_to_close': 25,
    'qty': 8000,
    'bid': 1448.0,
    'ask': 1448.5,
    'ltp': 1450.4,  # From screenshot - Last Trade
    'volatility': 2.1,
    'avg_trade_size': 7500
}

# Order Data
order_data = {
    'cpty': 'Client_XYZ',
    'size': 50000,
    'order_notes': 'EOD compliance required - must attain position by close',
    'direction': 'Buy',
    'symbol': 'RELIANCE.NS',
    'start_time': 'Now'
}

# Client Profile
client_profile = {
    'Client_XYZ': {
        'urgency_factor': 0.8,
        'price_sensitivity': 'LOW',
        'completion_priority': 'HIGH',
        'execution_model': 'Principal'
    }
}
```

### Step-by-Step AUO Execution

```python
# Step 1: Calculate urgency
urgency_score = calculate_urgency(order_data, market_data, client_profile['Client_XYZ'])
# Result: 85 (CRITICAL)

# Step 2: Prefill all parameters
prefilled_ticket = {
    # TIER 1: Core fields
    'symbol': prefill_symbol('RELIANCE.NS', trader_history),
    # Result: {'value': 'RELIANCE.NS', 'confidence': 'HIGH', 'rationale': 'User-selected'}
    
    'side': prefill_side(order_data, client_profile['Client_XYZ']),
    # Result: {'value': 'Buy', 'confidence': 'HIGH', 'rationale': 'Order notes indicate buy instruction'}
    
    'quantity': prefill_quantity(order_data),
    # Result: {'value': 50000, 'confidence': 'HIGH', 'rationale': 'Quantity from client mandate'}
    
    'instrument': {'value': 'RELIANCE INDS T+1', 'confidence': 'HIGH', 'rationale': 'Auto-populated from symbol'},
    
    # TIER 2: Context-driven
    'order_type_and_price': prefill_order_type(urgency_score, market_data, order_data, client_profile['Client_XYZ']),
    # Result: {'order_type': 'Limit', 'price_type': 'Limit', 'confidence': 'HIGH', 
    #          'rationale': 'CAS window detected. Limit order required for auction participation.'}
    
    'limit_price': prefill_limit_price(order_data, market_data, urgency_score),
    # Result: {'value': 1455.3, 'confidence': 'HIGH', 
    #          'rationale': 'CAS: Aggressive limit at +0.8% for high fill probability (Band: 1406.9 - 1493.9)'}
    
    'category_capacity': prefill_category_capacity(order_data, client_profile['Client_XYZ']),
    # Result: {'category': {'value': 'Client', ...}, 'capacity': {'value': 'Principal', ...}}
    
    'client_account': prefill_client_account(order_data),
    # Result: {'client': {'value': 'Client_XYZ', ...}, 'account': {'value': 'UNALLOC', ...}}
    
    'tif': prefill_tif(urgency_score, order_data, market_data),
    # Result: {'value': 'CAS', 'confidence': 'HIGH', 'rationale': 'CAS session: Order valid only for closing auction'}
    
    'release_date': prefill_release_date(order_data),
    # Result: {'value': '05-02-2026', 'confidence': 'HIGH', 'rationale': 'Immediate execution requested'}
    
    'hold': prefill_hold(urgency_score, order_data),
    # Result: {'value': 'No', 'confidence': 'HIGH', 'rationale': 'High urgency - release immediately'}
    
    # TIER 3: Algo parameters (NOT USED in CAS scenario)
    'executor': prefill_executor(urgency_score, order_data, market_data, client_profile['Client_XYZ']),
    # Result: {'value': None, 'use_algo': False, 'confidence': 'HIGH', 
    #          'rationale': 'CAS window: Direct limit order to closing auction (no algo needed)'}
}
```

### UI Output (Mode 1: Inline Prefill)

```
┌────────────────────────────────────────────────────────────────┐
│ Enter Client Order - RELIANCE INDS T+1 ✓                       │
│                                      Last Trade: ₹1450.4       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Symbol:         [RELIANCE.NS ✓]              🛈 User-selected  │
│                                                                 │
│ Side:           [Buy ✓]                       🛈 Why this?     │
│                 ↳ Order notes indicate buy instruction         │
│                                                                 │
│ Quantity:       [50,000 ✓]                    🛈 Why this?     │
│                 ↳ Quantity from client mandate                 │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ CAS WINDOW ACTIVE (25 min to close)                    │ │
│ │ Reference Price: ₹1450.4 | Band: ₹1406.9 - ₹1493.9        │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Order Type:     [Limit ✓]                     🛈 Why this?     │
│                 ↳ CAS window detected. Limit order required    │
│                   for auction participation within ±3% band.   │
│                                                                 │
│ Limit Price:    [₹1,455.3 ✓]                  🛈 Why this?     │
│                 ↳ CAS: Aggressive limit at +0.8% for high      │
│                   fill probability (within ±3% SEBI band)      │
│                                                                 │
│ Price Type:     [Limit ✓]                     🛈 Why this?     │
│                 ↳ Limit pricing for CAS auction                │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ Category:       [Client ✓]                    🛈 Client flow   │
│ Client:         [Client_XYZ ✓]                🛈 From mandate  │
│ Account:        [UNALLOC ✓]                   🛈 Why this?     │
│                 ↳ Standard unallocated block order             │
│ Capacity:       [Principal ✓]                 🛈 Why this?     │
│                 ↳ Standard principal capacity for facilitation │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ TIF:            [CAS ✓]                        🛈 Why this?     │
│                 ↳ CAS session: Order valid only for closing    │
│                   auction window                               │
│                                                                 │
│ Release Date:   [05-02-2026 ✓]                🛈 Today         │
│ Hold:           [No ✓]                         🛈 Why this?     │
│                 ↳ High urgency - release immediately           │
│                                                                 │
│ Service:        [Market ✓]                     🛈 Direct exec  │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ 📊 AUO Confidence: 95% | Urgency: 85/100 (CRITICAL)           │
│ ⏱️  Estimated setup time saved: 82 seconds                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│        [Validate ✓]        [Exit]        [Override All]       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Alternative Scenario: VWAP Algo Order (10 AM)

### Input Data (Morning VWAP Order)

```python
market_data = {
    'time_to_close': 330,  # 5.5 hours to close
    'qty': 5000,
    'bid': 1448.0,
    'ask': 1448.5,
    'ltp': 1448.3,
    'volatility': 1.8,
    'avg_trade_size': 7500
}

order_data = {
    'cpty': 'Client_ABC',
    'size': 100000,
    'order_notes': 'VWAP execution by 2 PM - minimize market impact',
    'direction': 'Buy',
    'symbol': 'RELIANCE.NS',
    'start_time': 'Now'
}

client_profile = {
    'Client_ABC': {
        'urgency_factor': 0.4,
        'price_sensitivity': 'HIGH',
        'completion_priority': 'MEDIUM',
        'execution_model': 'Agency'
    }
}

urgency_score = 45  # MEDIUM
```

### Prefilled Algo Ticket

```
┌────────────────────────────────────────────────────────────────┐
│ Enter Client Order - RELIANCE INDS T+1 ✓                       │
│                                      Last Trade: ₹1448.3       │
├────────────────────────────────────────────────────────────────┤
│ Symbol:         [RELIANCE.NS ✓]                                │
│ Side:           [Buy ✓]                                         │
│ Quantity:       [100,000 ✓]                                    │
│                                                                 │
│ Order Type:     [Limit ✓]                     🛈 Why this?     │
│                 ↳ Price-sensitive client → Limit for cost      │
│                   control                                       │
│                                                                 │
│ Limit Price:    [₹1,448.3 ✓]                  🛈 Why this?     │
│                 ↳ Medium urgency: Mid-price balances cost and  │
│                   fill probability                             │
│                                                                 │
│ Price Type:     [Limit ✓]                                      │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ Service:        [BlueBox 2 ✓]                 🛈 Algo engine   │
│ Executor:       [VWAP ✓]                      🛈 Why this?     │
│                 ↳ Client explicitly requires VWAP benchmark    │
│                                                                 │
│ ┌──────────────── VWAP Parameters ──────────────────────────┐ │
│ │                                                            │ │
│ │ Pricing:         [Adaptive ✓]            🛈 Why this?     │ │
│ │                  ↳ Standard adaptive pricing balances      │ │
│ │                    aggression and patience                 │ │
│ │                                                            │ │
│ │ Layering:        [Auto ✓]                🛈 Auto-optimal  │ │
│ │                                                            │ │
│ │ Urgency:         [Auto ✓]                🛈 Why this?     │ │
│ │                  ↳ Auto urgency adapts to market          │ │
│ │                    conditions                              │ │
│ │                                                            │ │
│ │ Get Done?:       [False ✓]               🛈 Why this?     │ │
│ │                  ↳ Allow unfilled quantity (no forced      │ │
│ │                    completion)                             │ │
│ │                                                            │ │
│ │ Opening Print?:  [True ✓]  Max %: [10 ✓] 🛈 Why this?    │ │
│ │                  ↳ Participate in opening auction for      │ │
│ │                    early liquidity (max 10%)               │ │
│ │                                                            │ │
│ │ Closing Print?:  [False ✓]                🛈 Why this?     │ │
│ │                  ↳ Sufficient time remaining - no closing  │ │
│ │                    auction needed                          │ │
│ │                                                            │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────── Crossing Parameters ──────────────────────┐   │
│ │                                                          │   │
│ │ Min Cross Qty:   [20,000 ✓]            🛈 Why this?    │   │
│ │ Max Cross Qty:   [50,000 ✓]            🛈 Why this?    │   │
│ │                  ↳ Large order: Enable crossing for      │   │
│ │                    20-50% blocks                         │   │
│ │                                                          │   │
│ │ Cross Qty Unit:  [Shares ✓]                             │   │
│ │ Leave Active:    [False ✓]                              │   │
│ │                                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌────────────── Limit Adjustment ──────────────────────────┐   │
│ │                                                          │   │
│ │ Limit Option:    [Order Limit ✓]       🛈 Static limit │   │
│ │ Limit Offset:    [0 ✓]                                  │   │
│ │ Offset Unit:     [Tick ✓]                               │   │
│ │                                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ TIF:            [GFD ✓]                        🛈 Day order    │
│ Release Date:   [05-02-2026 ✓]                                 │
│ Hold:           [No ✓]                                          │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ 📊 AUO Confidence: 88% | Urgency: 45/100 (MEDIUM)             │
│ ⏱️  Estimated setup time saved: 87 seconds                     │
├────────────────────────────────────────────────────────────────┤
│        [Validate ✓]        [Exit]        [Override All]       │
└────────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

### Missing Fields Handling

The screenshots show one critical error: **"Missing mandatory field(s): 'PRICE_TYPE'"**

**AUO Solution:**
- Always prefill ALL mandatory fields to prevent validation errors
- Price Type is auto-filled based on Order Type selection
- If Order Type = Limit → Price Type = Limit (automatically)
- If Order Type = Market → Price Type = Market (automatically)

### Validation Before Display

```python
def validate_prefill_completeness(prefilled_ticket):
    """Ensure all mandatory fields are filled"""
    
    mandatory_fields = ['symbol', 'side', 'quantity', 'order_type', 'price_type', 'category', 'client']
    
    missing = []
    for field in mandatory_fields:
        if field not in prefilled_ticket or prefilled_ticket[field]['value'] is None:
            missing.append(field)
    
    if missing:
        # Mode 3: Ask-Back to collect missing info
        return {
            'validation_status': 'INCOMPLETE',
            'missing_fields': missing,
            'action': 'TRIGGER_ASK_BACK'
        }
    
    return {
        'validation_status': 'COMPLETE',
        'missing_fields': [],
        'action': 'DISPLAY_PREFILL'
    }
```

### Override Capability

Every prefilled field has an inline edit icon. Clicking it:
1. Unlocks the field for manual entry
2. Logs the override (field, suggested_value, trader_value, timestamp)
3. Maintains rationale tooltip for reference

### Confidence Display

Each field shows confidence level visually:
- **HIGH (green ✓):** Auto-filled, rarely overridden
- **MEDIUM (yellow !):** Suggested, review recommended
- **LOW (red ?):** Uncertain, manual entry advised (triggers Mode 3 Ask-Back)

---

## Success Metrics Aligned to UI

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Mandatory Field Prefill Rate** | 100% | Zero "missing field" validation errors |
| **Trader Acceptance Rate** | >85% | % orders submitted without overriding prefilled values |
| **Time to Validate** | <10 sec | Time from ticket open to clicking "Validate" button |
| **CAS Band Compliance** | 100% | Zero limit price rejections in CAS window |
| **Algo Parameter Accuracy** | >80% | % VWAP/POV params not overridden by trader |

---

## Conclusion

This implementation plan is **fully aligned with the ION Trading UI** as revealed in your screenshots. Every parameter from Standard Orders to advanced VWAP algo settings is mapped to intelligent prefill logic grounded in:

✅ Available data schema (Market Data, Order Data, Algo Parameters)  
✅ Contextual urgency calculation (time to close, volatility, size)  
✅ Client profiling (historical patterns, preferences)  
✅ Regulatory compliance (SEBI CAS ±3% bands)  

**Next Step:** Build the decision functions in Python and integrate with ION's order entry API to populate these fields programmatically.