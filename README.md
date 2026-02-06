# AUO Frontend - Adaptive Urgency Orchestrator

**ION Trading - Global LDP Induction 2026**  
**Intelligent Order Prefill System**

---

## Overview

The AUO (Adaptive Urgency Orchestrator) Frontend is a minimal, functional React.js application that provides traders with an intelligent order entry interface. It automatically prefills all 34+ order parameters based on market context, client profiles, and order characteristics.

### Key Features

✅ **Intelligent Prefill**: Automatically fills all ION Trading UI parameters  
✅ **Urgency Calculation**: Real-time urgency scoring (0-100)  
✅ **CAS Detection**: Automatic closing auction session detection  
✅ **Explainable AI**: Rationale tooltip for every suggestion  
✅ **Compliance**: SEBI ±3% band validation for CAS orders  
✅ **Pure JavaScript**: No TypeScript, uses React.createElement()

---

## Technology Stack

- **React** 18.2.0 (Pure JavaScript - No JSX/TSX)
- **Vite** 5.0.8 (Build tool & dev server)
- **Native Fetch API** (HTTP client)
- **CSS3** (Minimal custom styling)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **Backend API**: Running on `http://localhost:8000`

---

## Installation

### Step 1: Clone/Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- react
- react-dom
- vite
- @vitejs/plugin-react

### Step 3: Configure Environment Variables

The `.env` file is already configured with default values:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0
```

**Important**: If your backend runs on a different port, update `VITE_API_URL` in the `.env` file.

---

## Running the Application

### Development Mode

```bash
npm run dev
```

This will:
- Start the Vite dev server on `http://localhost:5173`
- Enable hot module replacement (HMR)
- Automatically open the browser
- Proxy API requests to `http://localhost:8000`

### Build for Production

```bash
npm run build
```

This will:
- Create an optimized production build in the `dist/` directory
- Bundle and minify all JavaScript and CSS
- Generate source maps for debugging

### Preview Production Build

```bash
npm run preview
```

This will serve the production build on `http://localhost:4173` for testing.

---

## Project Structure

```
frontend/
├── public/
│   └── vite.svg              # Favicon
│
├── src/
│   ├── components/
│   │   ├── OrderEntryForm.js        # Order input form (4 fields)
│   │   ├── PrefillDisplay.js        # Display prefilled parameters
│   │   ├── ParameterCard.js         # Individual parameter with rationale
│   │   └── ValidationStatus.js      # Validation status indicator
│   │
│   ├── services/
│   │   └── apiService.js            # Backend API communication
│   │
│   ├── utils/
│   │   └── formatters.js            # Formatting utilities
│   │
│   ├── styles/
│   │   └── app.css                  # Main stylesheet
│   │
│   ├── App.js                       # Main application component
│   └── main.js                      # Application entry point
│
├── .env                      # Environment variables
├── index.html                # HTML template
├── package.json              # Dependencies & scripts
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

---

## Usage Guide

### 1. Start the Application

Ensure the backend API is running, then start the frontend:

```bash
npm run dev
```

### 2. Enter Order Details

The order entry form requires 4 inputs:

1. **Symbol**: Stock symbol (e.g., `RELIANCE.NS`, `INFY.NS`)
2. **Client**: Select from dropdown (e.g., `Client_XYZ`, `Client_ABC`)
3. **Quantity**: Number of shares (minimum 100)
4. **Order Notes**: Free text instructions (e.g., "EOD compliance required")

### 3. Get Prefill

Click **"Get AUO Prefill"** button. The system will:
- Calculate urgency score (0-100)
- Detect market state (CAS window, volatility, liquidity)
- Prefill all 34+ parameters
- Show confidence levels and rationales

### 4. Review Results

The prefill display shows:
- **Urgency Banner**: Score and classification (CRITICAL/HIGH/MEDIUM/LOW)
- **Market Context**: Time to close, CAS status, reference price bands
- **Parameter Sections**: Core details, pricing, client info, timing, algo parameters
- **Validation Status**: Completeness indicator and missing fields

### 5. Submit Order

Click **"Submit Order"** to send the order to the backend.

---

## Quick Examples

### Example 1: CAS Scenario (3:05 PM)

```
Symbol: RELIANCE.NS
Client: Client_XYZ
Quantity: 50000
Notes: EOD compliance required - must attain position by close
```

**Expected Result:**
- Urgency Score: ~85 (CRITICAL)
- CAS Detection: Active (25 min to close)
- Algo: Direct limit order (no algo in CAS window)
- Limit Price: Within ±3% SEBI band

### Example 2: Morning VWAP Scenario

```
Symbol: INFY.NS
Client: Client_ABC
Quantity: 75000
Notes: VWAP must complete by 2pm. Low volatility stock.
```

**Expected Result:**
- Urgency Score: ~45 (MEDIUM)
- Market State: Continuous trading
- Algo: VWAP with historical curve
- Opening Auction: Enabled (10% max)

---

## API Integration

The frontend communicates with the backend through these endpoints:

### GET /api/health
Check backend connectivity

### GET /api/clients
Fetch available clients

### GET /api/market/{symbol}
Get real-time market data for symbol

### POST /api/prefill
**Main endpoint** - Submit order input and receive prefilled parameters

Request:
```json
{
  "symbol": "RELIANCE.NS",
  "cpty_id": "Client_XYZ",
  "size": 50000,
  "order_notes": "EOD compliance required"
}
```

Response: Complete prefill data with all parameters

### POST /api/orders/submit
Submit final order

---

## Troubleshooting

### Backend Connection Error

**Issue**: "Cannot connect to backend API"

**Solution**:
1. Verify backend is running: `curl http://localhost:8000/api/health`
2. Check `.env` file has correct `VITE_API_URL`
3. Ensure no firewall blocking port 8000
4. Restart both frontend and backend

### Missing Fields Error

**Issue**: "Missing mandatory field(s): 'PRICE_TYPE'"

**Solution**: This should not occur with AUO prefill. If it does:
1. Check backend `/api/prefill` response includes all fields
2. Verify `price_type` is being set based on `order_type`
3. Review browser console for JavaScript errors

### Prefill Not Displaying

**Issue**: Clicking "Get Prefill" does nothing

**Solution**:
1. Open browser DevTools (F12) and check Console tab
2. Look for API errors or JavaScript exceptions
3. Verify all 4 form fields are filled
4. Check Network tab for failed API calls

---

## Development Notes

### Pure JavaScript Implementation

This project uses **React.createElement()** instead of JSX:

```javascript
// Instead of JSX:
// <div className="app-container">Hello</div>

// We use:
React.createElement('div', { className: 'app-container' }, 'Hello')
```

**Why?** To avoid TypeScript/JSX complexity and focus on functional logic.

### State Management

Uses **React hooks** (useState, useEffect) - no Redux or external state library.

### Styling Approach

Pure CSS with CSS variables for theming - no CSS-in-JS or Tailwind.

---

## Performance Optimization

### Current Optimizations

✅ Code splitting (React separate chunk)  
✅ Lazy loading (future enhancement)  
✅ Memoization opportunities identified  
✅ Minimal re-renders  

### Future Enhancements

- [ ] React.memo for expensive components
- [ ] useMemo for complex calculations
- [ ] Virtualization for large parameter lists
- [ ] Service worker for offline capability

---

## Browser Support

- **Chrome/Edge**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Mobile**: iOS Safari 14+, Chrome Android 90+

---

## Testing

### Manual Testing Checklist

- [ ] Form validation (empty fields, invalid inputs)
- [ ] API connectivity (backend running/stopped)
- [ ] Prefill display (all sections visible)
- [ ] Rationale tooltips (hover/click working)
- [ ] CAS detection (with different time_to_close values)
- [ ] Urgency classification colors
- [ ] Responsive design (mobile/tablet)

### Browser Console

Check for:
- No JavaScript errors
- API requests complete successfully
- Prefill data structure correct

---

## Deployment

### Production Checklist

1. Update `.env.production` with production API URL
2. Run `npm run build`
3. Test production build: `npm run preview`
4. Deploy `dist/` folder to:
   - **Vercel**: `vercel deploy`
   - **Netlify**: Drag & drop `dist/` folder
   - **AWS S3**: Upload to S3 bucket with static hosting

---

## Support

For issues or questions:

1. Check this README
2. Review browser console errors
3. Verify backend API is responding
4. Contact: ION Trading Global LDP Team

---

## License

MIT License - © 2026 ION Trading

---

## Acknowledgments

**ION Trading - Global LDP Induction 2026**  
**Team**: AUO Development Team  
**Project**: Adaptive Urgency Orchestrator  
**Tech Stack**: React.js (Pure JS) + Python FastAPI + MySQL