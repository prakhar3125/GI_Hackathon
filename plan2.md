# AUO Implementation Plan - Frontend & Backend
## Minimal Frontend + Fully Functional Backend

**ION Trading - Global LDP Induction 2026**  
**Tech Stack: React.js (Pure JS) + Python (Flask/FastAPI) + MySQL**  

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React.js - Pure JS)                │
│                                                                 │
│  ┌────────────────┐         ┌──────────────────┐              │
│  │  Order Entry   │────────▶│  Prefill Display │              │
│  │  Form (Simple) │         │  Component       │              │
│  └────────────────┘         └──────────────────┘              │
│           │                           ▲                         │
│           │ POST /api/prefill        │ JSON Response          │
│           ▼                           │                         │
└───────────────────────────────────────────────────────────────┘
                                │
                        REST API (JSON)
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Python Flask/FastAPI)               │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   API Layer  │───▶│  AUO Engine  │───▶│  DB Layer    │    │
│  │   (Routes)   │    │  (Core Logic)│    │  (MySQL ORM) │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                 │
│  AUO Engine Components:                                         │
│  • calculate_urgency()                                          │
│  • prefill_all_params()                                         │
│  • prefill_vwap_params()                                        │
│  • detect_cas_window()                                          │
│  • configure_crossing()                                         │
│  • calculate_limit_price()                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                        MySQL Connection
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                         MYSQL DATABASE                          │
│                                                                 │
│  • market_data          (15 rows pre-populated)                │
│  • client_profiles      (12 rows pre-populated)                │
│  • order_data           (empty - populated on order entry)     │
│  • algo_configs         (empty - AUO generates)                │
│  • execution_outcomes   (empty - post-execution)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend Implementation (Priority)

### 1.1 Technology Stack

**Core Framework:** Flask or FastAPI
- **Recommendation:** FastAPI (async support, auto-documentation, faster)
- **Alternative:** Flask (simpler, more familiar)

**Database:** MySQL 8.0
- **ORM:** SQLAlchemy (industry standard)
- **Migration Tool:** Alembic (for schema updates)

**Dependencies:**
```txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pymysql==1.1.0
pydantic==2.5.0
python-dotenv==1.0.0
```

---

### 1.2 Backend File Structure

```
backend/
├── app/
│   ├── __init__.py                 # App initialization
│   ├── main.py                     # FastAPI app entry point
│   │
│   ├── config.py                   # Configuration (DB connection, env vars)
│   │
│   ├── models/                     # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── market_data.py          # MarketData model
│   │   ├── client_profiles.py     # ClientProfile model
│   │   ├── order_data.py          # OrderData model
│   │   ├── algo_configs.py        # AlgoConfig model
│   │   └── execution_outcomes.py  # ExecutionOutcome model
│   │
│   ├── schemas/                    # Pydantic schemas (API contracts)
│   │   ├── __init__.py
│   │   ├── order_input.py         # OrderInputSchema
│   │   ├── prefill_response.py    # PrefillResponseSchema
│   │   └── validation_response.py # ValidationResponseSchema
│   │
│   ├── services/                   # Business logic (AUO Engine)
│   │   ├── __init__.py
│   │   ├── urgency_calculator.py  # calculate_urgency()
│   │   ├── prefill_engine.py      # Main prefill orchestrator
│   │   ├── cas_detector.py        # detect_cas_window()
│   │   ├── limit_calculator.py    # calculate_limit_price()
│   │   ├── vwap_configurator.py   # configure_vwap_params()
│   │   ├── crossing_configurator.py # configure_crossing_params()
│   │   └── iwould_configurator.py # configure_iwould_params()
│   │
│   ├── routes/                     # API endpoints
│   │   ├── __init__.py
│   │   ├── orders.py              # Order-related endpoints
│   │   ├── prefill.py             # /api/prefill endpoint
│   │   └── health.py              # Health check endpoint
│   │
│   ├── database.py                 # Database session management
│   └── utils.py                    # Helper functions
│
├── tests/                          # Unit tests
│   ├── test_urgency.py
│   ├── test_prefill.py
│   └── test_cas_detection.py
│
├── .env                            # Environment variables
├── requirements.txt                # Python dependencies
└── README.md                       # Setup instructions
```

---

### 1.3 Backend API Endpoints

#### **Endpoint 1: Health Check**
```
GET /api/health
Response: { "status": "healthy", "database": "connected", "version": "1.0.0" }
```

#### **Endpoint 2: Get Available Clients**
```
GET /api/clients
Response: [
  { "cpty_id": "Client_XYZ", "client_name": "XYZ Capital", "urgency_factor": 0.85 },
  { "cpty_id": "Client_ABC", "client_name": "ABC Asset Management", "urgency_factor": 0.50 }
]
```

#### **Endpoint 3: Get Market Data for Symbol**
```
GET /api/market/{symbol}
Example: GET /api/market/RELIANCE.NS
Response: {
  "symbol": "RELIANCE.NS",
  "ltp": 2570.2,
  "bid": 2570.0,
  "ask": 2570.5,
  "time_to_close": 25,
  "market_state": "CAS",
  "volatility_pct": 2.1,
  "avg_trade_size": 7500
}
```

#### **Endpoint 4: AUO Prefill (MAIN ENDPOINT)**
```
POST /api/prefill

Request Body:
{
  "symbol": "RELIANCE.NS",
  "cpty_id": "Client_XYZ",
  "size": 50000,
  "order_notes": "EOD compliance required - must attain position by close"
}

Response:
{
  "order_id": null,  // Will be generated on submission
  "urgency_score": 85,
  "urgency_classification": "CRITICAL",
  
  "prefilled_params": {
    // TIER 1: Always prefill
    "symbol": {
      "value": "RELIANCE.NS",
      "confidence": "HIGH",
      "rationale": "User-selected"
    },
    "side": {
      "value": "Buy",
      "confidence": "HIGH",
      "rationale": "Order notes indicate buy instruction"
    },
    "quantity": {
      "value": 50000,
      "confidence": "HIGH",
      "rationale": "Quantity from client mandate"
    },
    
    // TIER 2: Context-driven
    "order_type": {
      "value": "Limit",
      "confidence": "HIGH",
      "rationale": "CAS window detected. Limit order required for auction participation."
    },
    "price_type": {
      "value": "Limit",
      "confidence": "HIGH",
      "rationale": "Limit pricing for CAS auction"
    },
    "limit_price": {
      "value": 2575.3,
      "confidence": "HIGH",
      "rationale": "CAS: Aggressive limit at +0.8% for high fill probability (Band: 2494.9 - 2645.5)"
    },
    "tif": {
      "value": "CAS",
      "confidence": "HIGH",
      "rationale": "CAS session: Order valid only for closing auction window"
    },
    "category": {
      "value": "Client",
      "confidence": "HIGH",
      "rationale": "Client order flow"
    },
    "client": {
      "value": "Client_XYZ",
      "confidence": "HIGH",
      "rationale": "Client from order mandate"
    },
    "account": {
      "value": "UNALLOC",
      "confidence": "MEDIUM",
      "rationale": "Standard unallocated block order"
    },
    "capacity": {
      "value": "Principal",
      "confidence": "MEDIUM",
      "rationale": "Standard principal capacity for facilitation"
    },
    "release_date": {
      "value": "2026-02-05",
      "confidence": "HIGH",
      "rationale": "Immediate execution requested"
    },
    "hold": {
      "value": false,
      "confidence": "HIGH",
      "rationale": "High urgency - release immediately"
    },
    "service": {
      "value": "Market",
      "confidence": "HIGH",
      "rationale": "Direct market execution"
    },
    
    // TIER 3: Algo parameters (null in CAS scenario)
    "use_algo": false,
    "executor": {
      "value": null,
      "confidence": "HIGH",
      "rationale": "CAS window: Direct limit order to closing auction (no algo needed)"
    }
  },
  
  "market_context": {
    "time_to_close": 25,
    "market_state": "CAS",
    "cas_active": true,
    "cas_reference_price": 2570.2,
    "cas_upper_band": 2645.5,
    "cas_lower_band": 2494.9,
    "volatility": "MEDIUM",
    "liquidity": "HIGH"
  },
  
  "validation": {
    "all_mandatory_filled": true,
    "missing_fields": [],
    "warnings": [],
    "ready_to_submit": true
  },
  
  "metadata": {
    "auo_version": "1.0.0",
    "processing_time_ms": 45,
    "confidence_score": 0.95,
    "timestamp": "2026-02-05T15:05:30.123456Z"
  }
}
```

#### **Endpoint 5: Submit Order**
```
POST /api/orders/submit

Request Body: (Same as prefill response, potentially with trader overrides)
{
  "prefilled_params": { ... },
  "trader_overrides": {
    "limit_price": 2580.0  // Example: trader changed the limit price
  }
}

Response:
{
  "order_id": 16,
  "status": "submitted",
  "submission_time": "2026-02-05T15:05:45.000000Z",
  "validation_status": "PASSED"
}
```

#### **Endpoint 6: Get Order by ID**
```
GET /api/orders/{order_id}
Response: { order details + algo config + execution outcome if available }
```

---

### 1.4 Core Backend Logic - Detailed Breakdown

#### **Service 1: Urgency Calculator (`urgency_calculator.py`)**

```python
"""
urgency_calculator.py
Calculate urgency score (0-100) from multiple factors
"""

def calculate_urgency(order_data, market_data, client_profile):
    """
    Urgency Score = 
        Time Pressure (40%) + 
        Size Pressure (30%) + 
        Client Factor (20%) + 
        Notes Urgency (10%)
    
    Returns: float (0-100)
    """
    
    # 1. Time Pressure (40 points max)
    time_to_close = market_data['time_to_close']
    if time_to_close <= 25:  # CAS window
        time_score = 40
    else:
        time_score = (1 - time_to_close / 390) * 40  # 390 = 6.5 hours
    
    # 2. Size Pressure (30 points max)
    size_ratio = order_data['size'] / market_data['avg_trade_size']
    if size_ratio > 20:
        size_score = 30
    elif size_ratio > 10:
        size_score = 25
    elif size_ratio > 5:
        size_score = 20
    else:
        size_score = size_ratio * 3  # Linear for small orders
    
    # 3. Client Urgency Factor (20 points max)
    client_score = client_profile['urgency_factor'] * 20
    
    # 4. Notes Urgency (10 points max)
    notes_lower = order_data['order_notes'].lower()
    urgency_keywords = [
        ('urgent', 10), ('critical', 10), ('immediate', 10),
        ('must complete', 8), ('eod compliance', 8),
        ('rush', 7), ('asap', 7),
        ('patient', -5), ('no urgency', -5)
    ]
    
    notes_score = 0
    for keyword, score in urgency_keywords:
        if keyword in notes_lower:
            notes_score = max(notes_score, score)
            break
    
    # Final composite score
    urgency_score = time_score + size_score + client_score + notes_score
    urgency_score = max(0, min(100, urgency_score))  # Clamp to 0-100
    
    # Classification
    if urgency_score >= 80:
        classification = 'CRITICAL'
    elif urgency_score >= 60:
        classification = 'HIGH'
    elif urgency_score >= 40:
        classification = 'MEDIUM'
    else:
        classification = 'LOW'
    
    return {
        'urgency_score': round(urgency_score, 2),
        'classification': classification,
        'breakdown': {
            'time_pressure': round(time_score, 2),
            'size_pressure': round(size_score, 2),
            'client_factor': round(client_score, 2),
            'notes_urgency': notes_score
        }
    }
```

#### **Service 2: CAS Detector (`cas_detector.py`)**

```python
"""
cas_detector.py
Detect Closing Auction Session (CAS) window
"""

def detect_cas_window(market_data):
    """
    NSE CAS window: 3:05 PM - 3:30 PM (last 25 minutes)
    Returns: bool + context
    """
    
    time_to_close = market_data['time_to_close']
    
    if time_to_close <= 25:
        # CAS is active
        return {
            'cas_active': True,
            'time_to_close': time_to_close,
            'market_state': 'CAS',
            'reference_price': market_data['ltp'],  # In production: fetch from exchange at 3:15 PM
            'upper_band': market_data['ltp'] * 1.03,  # +3%
            'lower_band': market_data['ltp'] * 0.97,  # -3%
            'rationale': 'Within CAS window (25 min to close). Auto-routing to closing auction.'
        }
    elif time_to_close <= 60:
        # Pre-CAS (3:00 PM - 3:05 PM)
        return {
            'cas_active': False,
            'approaching_cas': True,
            'time_to_close': time_to_close,
            'market_state': 'Pre_Close',
            'rationale': f'{time_to_close} min to CAS window. Consider closing auction participation.'
        }
    else:
        # Normal continuous trading
        return {
            'cas_active': False,
            'approaching_cas': False,
            'time_to_close': time_to_close,
            'market_state': 'Continuous',
            'rationale': 'Continuous trading session'
        }
```

#### **Service 3: Limit Price Calculator (`limit_calculator.py`)**

```python
"""
limit_calculator.py
Calculate intelligent limit price based on urgency and market conditions
"""

def calculate_limit_price(order_data, market_data, urgency_score, cas_context):
    """
    Returns: float + rationale
    """
    
    side = order_data['side']
    ltp = market_data['ltp']
    bid = market_data['bid']
    ask = market_data['ask']
    spread_pct = (ask - bid) / ltp * 100
    
    # CAS-specific pricing
    if cas_context['cas_active']:
        reference_price = cas_context['reference_price']
        upper_band = cas_context['upper_band']
        lower_band = cas_context['lower_band']
        
        if side == 'Buy':
            if urgency_score > 80:
                limit = reference_price * 1.008  # +0.8% (aggressive)
                rationale = 'CAS: Aggressive limit at +0.8% for high fill probability'
            else:
                limit = reference_price * 1.005  # +0.5% (moderate)
                rationale = 'CAS: Moderate limit at +0.5% within ±3% band'
            
            # Ensure within band
            limit = min(limit, upper_band)
        
        else:  # Sell
            if urgency_score > 80:
                limit = reference_price * 0.992  # -0.8%
                rationale = 'CAS: Aggressive limit at -0.8% for high fill probability'
            else:
                limit = reference_price * 0.995  # -0.5%
                rationale = 'CAS: Moderate limit at -0.5% within ±3% band'
            
            # Ensure within band
            limit = max(limit, lower_band)
        
        return {
            'value': round(limit, 1),
            'confidence': 'HIGH',
            'rationale': f'{rationale} (Band: {lower_band:.1f} - {upper_band:.1f})'
        }
    
    # Non-CAS pricing
    if side == 'Buy':
        if urgency_score > 70:
            limit = ask
            rationale = 'High urgency: Limit at ask price for immediate execution'
        elif urgency_score > 40:
            limit = (bid + ask) / 2
            rationale = 'Medium urgency: Limit at mid-price balances cost and fill probability'
        else:
            limit = bid + (spread_pct * 0.25)
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

#### **Service 4: Prefill Engine (Main Orchestrator) (`prefill_engine.py`)**

```python
"""
prefill_engine.py
Main orchestrator that calls all sub-services
"""

from .urgency_calculator import calculate_urgency
from .cas_detector import detect_cas_window
from .limit_calculator import calculate_limit_price
from .vwap_configurator import configure_vwap_params
# ... other imports

def prefill_all_params(order_input, db_session):
    """
    Main function: Takes order input, returns complete prefill response
    
    Args:
        order_input: OrderInputSchema (symbol, cpty_id, size, order_notes)
        db_session: SQLAlchemy session
    
    Returns:
        PrefillResponseSchema (all parameters + rationales)
    """
    
    # Step 1: Fetch market data
    market_data = fetch_market_data(order_input.symbol, db_session)
    
    # Step 2: Fetch client profile
    client_profile = fetch_client_profile(order_input.cpty_id, db_session)
    
    # Step 3: Calculate urgency
    urgency_result = calculate_urgency(order_input, market_data, client_profile)
    
    # Step 4: Detect CAS window
    cas_context = detect_cas_window(market_data)
    
    # Step 5: Prefill all parameters
    prefilled = {}
    
    # TIER 1: Core fields
    prefilled['symbol'] = prefill_symbol(order_input.symbol)
    prefilled['side'] = prefill_side(order_input, client_profile)
    prefilled['quantity'] = prefill_quantity(order_input)
    
    # TIER 2: Context-driven fields
    prefilled['order_type'] = prefill_order_type(urgency_result, cas_context)
    prefilled['price_type'] = prefill_price_type(prefilled['order_type'])
    prefilled['limit_price'] = calculate_limit_price(
        order_input, market_data, urgency_result['urgency_score'], cas_context
    )
    prefilled['tif'] = prefill_tif(urgency_result, cas_context)
    prefilled['category'] = prefill_category()
    prefilled['client'] = prefill_client(order_input)
    prefilled['account'] = prefill_account(order_input)
    prefilled['capacity'] = prefill_capacity(client_profile)
    prefilled['release_date'] = prefill_release_date()
    prefilled['hold'] = prefill_hold(urgency_result)
    prefilled['service'] = prefill_service(cas_context)
    
    # TIER 3: Algo parameters (conditional)
    if not cas_context['cas_active']:
        # Only use algo if NOT in CAS window
        executor_choice = prefill_executor(urgency_result, order_input, market_data, client_profile)
        
        if executor_choice['use_algo']:
            prefilled['use_algo'] = True
            prefilled['executor'] = executor_choice['value']
            prefilled['service'] = 'BlueBox 2'
            
            if executor_choice['value'] == 'VWAP':
                prefilled['vwap_params'] = configure_vwap_params(
                    urgency_result, order_input, market_data
                )
            # ... other algo types
        else:
            prefilled['use_algo'] = False
            prefilled['executor'] = None
    else:
        # CAS window - no algo
        prefilled['use_algo'] = False
        prefilled['executor'] = {
            'value': None,
            'confidence': 'HIGH',
            'rationale': 'CAS window: Direct limit order to closing auction (no algo needed)'
        }
    
    # Step 6: Validate completeness
    validation_result = validate_prefill_completeness(prefilled)
    
    # Step 7: Build response
    response = {
        'order_id': None,
        'urgency_score': urgency_result['urgency_score'],
        'urgency_classification': urgency_result['classification'],
        'prefilled_params': prefilled,
        'market_context': {
            'time_to_close': market_data['time_to_close'],
            'market_state': cas_context['market_state'],
            'cas_active': cas_context['cas_active'],
            **cas_context
        },
        'validation': validation_result,
        'metadata': {
            'auo_version': '1.0.0',
            'processing_time_ms': calculate_processing_time(),
            'confidence_score': calculate_overall_confidence(prefilled),
            'timestamp': datetime.now().isoformat()
        }
    }
    
    return response
```

---

## Phase 2: Frontend Implementation (Minimal MVP)

### 2.1 Technology Stack

**Framework:** React.js (Pure JavaScript - No TypeScript/JSX)
- **Bundler:** Vite (faster than Create React App)
- **HTTP Client:** Fetch API (native) or Axios
- **State Management:** React useState/useEffect (no Redux for MVP)

**Dependencies:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

---

### 2.2 Frontend File Structure

```
frontend/
├── public/
│   └── index.html
│
├── src/
│   ├── App.js                      # Main app component
│   ├── main.js                     # Entry point
│   │
│   ├── components/
│   │   ├── OrderEntryForm.js       # Simple form to input order details
│   │   ├── PrefillDisplay.js       # Display prefilled parameters
│   │   ├── ParameterCard.js        # Individual parameter display with rationale
│   │   └── ValidationStatus.js     # Show validation warnings/errors
│   │
│   ├── services/
│   │   └── apiService.js           # Axios/Fetch wrapper for API calls
│   │
│   ├── utils/
│   │   └── formatters.js           # Currency, date, number formatters
│   │
│   └── styles/
│       └── app.css                 # Minimal CSS
│
├── .env                            # Environment variables (API URL)
├── package.json
├── vite.config.js
└── README.md
```

---

### 2.3 Minimal UI Components (Detailed)

#### **Component 1: Order Entry Form (`OrderEntryForm.js`)**

**Purpose:** Collect minimal input from trader
- Symbol (text input with autocomplete later)
- Client (dropdown from /api/clients)
- Quantity (number input)
- Order Notes (textarea)

**UI State:** 4 fields only

**Output:** Calls POST /api/prefill when "Get Prefill" button clicked

```javascript
// OrderEntryForm.js (Pseudo-structure)

function OrderEntryForm({ onPrefillReceived }) {
  const [symbol, setSymbol] = useState('');
  const [client, setClient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const response = await fetch('http://localhost:8000/api/prefill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: symbol,
        cpty_id: client,
        size: parseInt(quantity),
        order_notes: notes
      })
    });
    
    const data = await response.json();
    setLoading(false);
    onPrefillReceived(data);  // Pass to parent component
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        placeholder="Symbol (e.g., RELIANCE.NS)" 
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        required
      />
      
      <select value={client} onChange={(e) => setClient(e.target.value)} required>
        <option value="">Select Client</option>
        <option value="Client_XYZ">Client_XYZ (XYZ Capital)</option>
        <option value="Client_ABC">Client_ABC (ABC Asset)</option>
      </select>
      
      <input 
        type="number" 
        placeholder="Quantity" 
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
      
      <textarea 
        placeholder="Order Notes (e.g., EOD compliance required)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows="3"
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Calculating...' : 'Get AUO Prefill'}
      </button>
    </form>
  );
}
```

#### **Component 2: Prefill Display (`PrefillDisplay.js`)**

**Purpose:** Display all prefilled parameters in organized sections

**UI Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ AUO Prefill Results                                      │
│                                                          │
│ Urgency Score: 85/100 (CRITICAL) 🔴                     │
│ Market State: CAS Window Active (25 min to close)       │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ CORE ORDER DETAILS                                       │
│                                                          │
│ Symbol:      RELIANCE.NS ✓                              │
│ Side:        Buy ✓         [Why?] Order notes indicate  │
│ Quantity:    50,000 ✓                                   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ PRICING & EXECUTION                                      │
│                                                          │
│ Order Type:  Limit ✓       [Why?] CAS window detected   │
│ Limit Price: ₹2,575.3 ✓    [Why?] +0.8% for fill prob  │
│ TIF:         CAS ✓         [Why?] Valid for CAS only    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ CLIENT & ACCOUNT                                         │
│                                                          │
│ Category:    Client ✓                                   │
│ Client:      Client_XYZ ✓                               │
│ Account:     UNALLOC ✓     [Why?] Standard block        │
│ Capacity:    Principal ✓                                │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ [Submit Order]  [Override Fields]  [Cancel]             │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
```javascript
function PrefillDisplay({ prefillData }) {
  const { urgency_score, urgency_classification, prefilled_params, market_context } = prefillData;
  
  return (
    <div className="prefill-container">
      <div className="urgency-banner" data-urgency={urgency_classification}>
        Urgency: {urgency_score}/100 ({urgency_classification})
      </div>
      
      <div className="market-context">
        {market_context.cas_active && (
          <div className="cas-warning">
            ⚠️ CAS Window Active: {market_context.time_to_close} min to close
            <br/>
            Band: ₹{market_context.cas_lower_band.toFixed(1)} - ₹{market_context.cas_upper_band.toFixed(1)}
          </div>
        )}
      </div>
      
      <section className="param-section">
        <h3>Core Order Details</h3>
        <ParameterCard param={prefilled_params.symbol} label="Symbol" />
        <ParameterCard param={prefilled_params.side} label="Side" />
        <ParameterCard param={prefilled_params.quantity} label="Quantity" />
      </section>
      
      <section className="param-section">
        <h3>Pricing & Execution</h3>
        <ParameterCard param={prefilled_params.order_type} label="Order Type" />
        <ParameterCard param={prefilled_params.limit_price} label="Limit Price" />
        <ParameterCard param={prefilled_params.tif} label="TIF" />
      </section>
      
      {/* ... more sections */}
      
      <div className="action-buttons">
        <button className="btn-primary">Submit Order</button>
        <button className="btn-secondary">Override Fields</button>
        <button className="btn-tertiary">Cancel</button>
      </div>
    </div>
  );
}
```

#### **Component 3: Parameter Card (`ParameterCard.js`)**

**Purpose:** Display individual parameter with confidence indicator + rationale tooltip

```javascript
function ParameterCard({ param, label }) {
  const [showRationale, setShowRationale] = useState(false);
  
  const confidenceIcon = {
    'HIGH': '✓',
    'MEDIUM': '!',
    'LOW': '?'
  };
  
  const confidenceColor = {
    'HIGH': 'green',
    'MEDIUM': 'yellow',
    'LOW': 'red'
  };
  
  return (
    <div className="param-card">
      <div className="param-label">{label}:</div>
      <div className="param-value" style={{ color: confidenceColor[param.confidence] }}>
        {param.value} {confidenceIcon[param.confidence]}
      </div>
      <button 
        className="rationale-btn" 
        onMouseEnter={() => setShowRationale(true)}
        onMouseLeave={() => setShowRationale(false)}
      >
        Why?
      </button>
      
      {showRationale && (
        <div className="rationale-tooltip">
          {param.rationale}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 3: Database Setup & Population

### 3.1 Database Initialization

**Step 1:** Run the complete schema SQL
```bash
mysql -u root -p < complete_database_schema.sql
```

**Step 2:** Run the insert statements
```bash
mysql -u root -p auo_hackathon < complete_database_inserts.sql
```

**Step 3:** Verify population
```sql
USE auo_hackathon;

SELECT 'market_data' as table_name, COUNT(*) as rows FROM market_data
UNION ALL
SELECT 'client_profiles', COUNT(*) FROM client_profiles
UNION ALL
SELECT 'order_data', COUNT(*) FROM order_data
UNION ALL
SELECT 'algo_configs', COUNT(*) FROM algo_configs;

-- Expected: 15, 12, 15, 15
```

---

## Phase 4: Integration & Testing

### 4.1 Backend Testing Checklist

**Unit Tests:**
- [ ] `test_urgency_calculator.py` - Test urgency calculation with different inputs
- [ ] `test_cas_detector.py` - Verify CAS detection at different times
- [ ] `test_limit_price.py` - Validate limit price calculation
- [ ] `test_vwap_configurator.py` - Test VWAP parameter generation

**Integration Tests:**
- [ ] Test full /api/prefill flow with Problem Statement Case 1 (CAS scenario)
- [ ] Test full /api/prefill flow with Problem Statement Case 2 (VWAP scenario)
- [ ] Test database connections and queries
- [ ] Test error handling (invalid symbol, missing client, etc.)

**API Testing (Postman/cURL):**
```bash
# Test 1: CAS Scenario (3:05 PM)
curl -X POST http://localhost:8000/api/prefill \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "RELIANCE.NS",
    "cpty_id": "Client_XYZ",
    "size": 50000,
    "order_notes": "EOD compliance required - must attain position by close"
  }'

# Expected: Urgency ~85, CAS detection, Limit price within ±3% band

# Test 2: Morning VWAP Scenario
curl -X POST http://localhost:8000/api/prefill \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "INFY.NS",
    "cpty_id": "Client_ABC",
    "size": 75000,
    "order_notes": "VWAP must complete by 2pm"
  }'

# Expected: Urgency ~45, VWAP algo selected, Opening auction participation
```

### 4.2 Frontend Testing Checklist

**Manual Testing:**
- [ ] Form submission with valid inputs
- [ ] Display prefill results correctly
- [ ] Hover over "Why?" shows rationale tooltip
- [ ] Urgency classification colors display correctly (green/yellow/red)
- [ ] CAS warning banner appears when applicable
- [ ] Loading state during API call

**Edge Cases:**
- [ ] Invalid symbol (not in database)
- [ ] Invalid client (not in database)
- [ ] Network error handling
- [ ] Empty form submission

---

## Phase 5: Deployment Plan

### 5.1 Local Development Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="mysql+pymysql://root:password@localhost/auo_hackathon"
export DEBUG=True

# Run server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

**Database:**
```bash
mysql -u root -p
# Run schema + insert SQL scripts
```

### 5.2 Production Deployment (Later)

**Backend:** AWS Lambda + API Gateway OR Heroku/Railway
**Frontend:** Vercel/Netlify (static hosting)
**Database:** AWS RDS MySQL OR PlanetScale

---

## Phase 6: Success Criteria

### Minimum Viable Product (MVP) Requirements

**Backend Must-Haves:**
✅ All 6 API endpoints functional
✅ Urgency calculation accurate (within ±5 points of expected)
✅ CAS detection working for time_to_close <= 25
✅ Limit price calculation within ±3% SEBI band for CAS
✅ All 34 UI parameters prefilled
✅ Database queries optimized (<50ms per query)
✅ API response time <200ms

**Frontend Must-Haves:**
✅ Order entry form with 4 inputs
✅ API call to /api/prefill on submit
✅ Display all prefilled parameters organized by section
✅ Show rationale tooltips on hover
✅ Visual confidence indicators (green/yellow/red)
✅ CAS warning banner when applicable
✅ Loading state during API calls

**Demo Scenarios:**
✅ Problem Statement Case 1 (Client_XYZ 3:05 PM EOD) works
✅ Problem Statement Case 2 (Client_ABC VWAP morning) works
✅ At least 3 additional test scenarios

---

## Timeline Estimate

**Phase 1 (Backend Core):** 2 days
- Database models + schema alignment
- API endpoint skeleton
- Core services (urgency, CAS detection, limit calc)

**Phase 2 (Backend Logic):** 2 days
- Complete all prefill functions
- VWAP/POV/ICEBERG configurators
- Testing + validation

**Phase 3 (Frontend Minimal):** 1 day
- Order entry form
- Prefill display component
- API integration

**Phase 4 (Integration & Testing):** 1 day
- End-to-end testing
- Bug fixes
- Documentation

**Total MVP Time:** ~6 days (for 1 developer)

---

## Future Enhancements (Post-MVP)

**Backend:**
- [ ] Add authentication (JWT tokens)
- [ ] Real-time market data feed integration
- [ ] Machine learning model for urgency prediction
- [ ] Historical performance analytics
- [ ] Trader override tracking and learning

**Frontend:**
- [ ] Rich UI with drag-and-drop field overrides
- [ ] Real-time market data display
- [ ] Historical order comparison
- [ ] Confidence score visualization (charts)
- [ ] Mobile-responsive design

---

## Critical Notes

### 🔴 **For Hackathon Demo:**

**Backend Priority:** Get these working FIRST:
1. `/api/prefill` endpoint (main functionality)
2. Urgency calculation
3. CAS detection + limit price calculation
4. Database queries

**Frontend Priority:** Keep it SIMPLE:
1. Basic form (4 fields)
2. Display prefill results (read-only)
3. No complex UI interactions (just show/hide rationale)

**Demo Script:**
1. Show empty form
2. Enter: RELIANCE.NS, Client_XYZ, 50000, "EOD compliance"
3. Click "Get Prefill"
4. Explain urgency score (85 = CRITICAL)
5. Show CAS detection (25 min to close)
6. Show limit price calculation (within ±3% band)
7. Highlight all 34 parameters prefilled automatically
8. "Trader can submit in <10 seconds vs 90 seconds manual"

### ✅ **Key Differentiators:**
- **100% field coverage** (all 34 UI parameters mapped)
- **Contextual intelligence** (CAS detection, urgency scoring)
- **Regulatory compliance** (SEBI ±3% band enforcement)
- **Explainability** (rationale for every suggestion)
- **Production-ready** (DECIMAL precision, timestamp sync, profile versioning)

---

**This plan provides a complete roadmap from database to demo-ready application. Focus on backend first, then minimal frontend for visualization.** 🚀