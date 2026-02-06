-- ========================================
-- AUO HACKATHON - EXPANDED REALISTIC DATA
-- 3 Tables + JSON storage strategy
-- ========================================

CREATE DATABASE IF NOT EXISTS auo_hackathon;
USE auo_hackathon;

DROP TABLE IF EXISTS order_data;
DROP TABLE IF EXISTS client_profiles;
DROP TABLE IF EXISTS market_data;

-- ========================================
-- TABLE 1: MARKET DATA
-- ========================================
CREATE TABLE market_data (
    snapshot_id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(20) NOT NULL,
    snapshot_time DATETIME(6) NOT NULL,
    time_to_close INT NOT NULL,
    bid DECIMAL(18,4) NOT NULL,
    ask DECIMAL(18,4) NOT NULL,
    ltp DECIMAL(18,4) NOT NULL,
    volatility_pct DECIMAL(8,4) NOT NULL,
    avg_trade_size INT NOT NULL,
    INDEX idx_symbol (symbol)
);

-- ========================================
-- TABLE 2: CLIENT PROFILES
-- ========================================
CREATE TABLE client_profiles (
    cpty_id VARCHAR(50) PRIMARY KEY,
    client_name VARCHAR(100),
    urgency_factor DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    price_sensitivity ENUM('High', 'Low') DEFAULT 'Low',
    execution_model ENUM('Agency', 'Principal') DEFAULT 'Principal'
);

-- ========================================
-- TABLE 3: ORDER DATA (with JSON blobs)
-- ========================================
CREATE TABLE order_data (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(20) NOT NULL,
    cpty_id VARCHAR(50) NOT NULL,
    side ENUM('Buy', 'Sell'),
    size INT NOT NULL,
    order_notes TEXT,
    arrival_time DATETIME(6) NOT NULL,
    prefill_result JSON,
    submitted_params JSON,
    trader_overrides JSON,
    submission_status ENUM('Draft', 'Submitted', 'Cancelled') DEFAULT 'Draft',
    submitted_at DATETIME(6),
    FOREIGN KEY (cpty_id) REFERENCES client_profiles(cpty_id)
);

-- ========================================
-- INSERTS: CLIENT PROFILES (50 Clients - Realistic Global Firms)
-- ========================================
INSERT INTO client_profiles (cpty_id, client_name, urgency_factor, price_sensitivity, execution_model) VALUES
-- Tier 1 - High Frequency / Urgent Clients
('GS_NY_001', 'Goldman Sachs Asset Management', 0.95, 'Low', 'Principal'),
('JPM_LON_002', 'JP Morgan Investment Bank', 0.92, 'Low', 'Principal'),
('MS_NYC_003', 'Morgan Stanley Wealth Management', 0.88, 'Low', 'Principal'),
('CITI_SG_004', 'Citigroup Global Markets', 0.90, 'Low', 'Principal'),
('BARC_UK_005', 'Barclays Capital', 0.87, 'Low', 'Principal'),

-- Tier 2 - Active Institutional Clients
('BLK_US_006', 'BlackRock Institutional', 0.82, 'Low', 'Principal'),
('VAN_US_007', 'Vanguard Group', 0.65, 'High', 'Agency'),
('STT_BOS_008', 'State Street Global Advisors', 0.78, 'Low', 'Principal'),
('FID_US_009', 'Fidelity Investments', 0.75, 'Low', 'Principal'),
('PIMCO_010', 'PIMCO Fixed Income', 0.68, 'High', 'Agency'),
('INVESCO_011', 'Invesco Asset Management', 0.72, 'Low', 'Principal'),
('TCAP_012', 'T. Rowe Price', 0.70, 'Low', 'Principal'),
('FRANK_013', 'Franklin Templeton', 0.67, 'High', 'Agency'),

-- Tier 3 - Hedge Funds
('BWATER_014', 'Bridgewater Associates', 0.85, 'Low', 'Principal'),
('AQR_015', 'AQR Capital Management', 0.80, 'Low', 'Principal'),
('RENTECH_016', 'Renaissance Technologies', 0.93, 'Low', 'Principal'),
('CITADEL_017', 'Citadel LLC', 0.91, 'Low', 'Principal'),
('2SIGMA_018', 'Two Sigma Investments', 0.89, 'Low', 'Principal'),
('DESHAW_019', 'D.E. Shaw Group', 0.86, 'Low', 'Principal'),
('MILLEN_020', 'Millennium Management', 0.84, 'Low', 'Principal'),

-- Tier 4 - Pension Funds & Insurance
('CALPERS_021', 'CalPERS', 0.45, 'High', 'Agency'),
('NYPENS_022', 'NY State Pension Fund', 0.48, 'High', 'Agency'),
('ONTPEN_023', 'Ontario Teachers Pension', 0.50, 'High', 'Agency'),
('NORGES_024', 'Norges Bank Investment', 0.42, 'High', 'Agency'),
('METLIFE_025', 'MetLife Investment', 0.55, 'High', 'Agency'),
('PRUDEN_026', 'Prudential Financial', 0.52, 'High', 'Agency'),

-- Tier 5 - Sovereign Wealth & Endowments
('ADIA_027', 'Abu Dhabi Investment Authority', 0.38, 'High', 'Agency'),
('GIC_SG_028', 'GIC Private Limited', 0.40, 'High', 'Agency'),
('SAFE_CN_029', 'SAFE China', 0.35, 'High', 'Agency'),
('HARV_END_030', 'Harvard Management Co', 0.43, 'High', 'Agency'),
('YALE_END_031', 'Yale Investments', 0.46, 'High', 'Agency'),

-- Tier 6 - Boutique / Regional
('WELLIN_032', 'Wellington Management', 0.63, 'High', 'Agency'),
('CAPITAL_033', 'Capital Group', 0.60, 'High', 'Agency'),
('NEUBER_034', 'Neuberger Berman', 0.58, 'High', 'Agency'),
('ALLIANCE_035', 'AllianceBernstein', 0.62, 'High', 'Agency'),
('JANUS_036', 'Janus Henderson', 0.56, 'High', 'Agency'),

-- Tier 7 - Family Offices & Private Wealth
('SOROS_037', 'Soros Fund Management', 0.73, 'Low', 'Principal'),
('TIGER_038', 'Tiger Global Management', 0.77, 'Low', 'Principal'),
('VIKING_039', 'Viking Global Investors', 0.74, 'Low', 'Principal'),
('MAVERICK_040', 'Maverick Capital', 0.71, 'Low', 'Principal'),

-- Tier 8 - Proprietary Trading / Market Makers
('JUMP_041', 'Jump Trading', 0.96, 'Low', 'Principal'),
('VIRTU_042', 'Virtu Financial', 0.94, 'Low', 'Principal'),
('SUSQ_043', 'Susquehanna International', 0.95, 'Low', 'Principal'),
('OPTIVER_044', 'Optiver', 0.93, 'Low', 'Principal'),
('IMC_045', 'IMC Trading', 0.94, 'Low', 'Principal'),

-- Tier 9 - Mutual Fund Complexes
('AMUNDI_046', 'Amundi Asset Management', 0.54, 'High', 'Agency'),
('DWS_047', 'DWS Group', 0.51, 'High', 'Agency'),
('LGIM_048', 'Legal & General Investment', 0.49, 'High', 'Agency'),
('SCHROD_049', 'Schroders', 0.53, 'High', 'Agency'),
('ABERDEEN_050', 'abrdn', 0.47, 'High', 'Agency');

-- ========================================
-- INSERTS: MARKET DATA (70+ Realistic Indian Stocks)
-- ========================================
INSERT INTO market_data (symbol, snapshot_time, time_to_close, bid, ask, ltp, volatility_pct, avg_trade_size) VALUES
-- Large Cap - Nifty 50 Leaders (High liquidity, tight spreads)
('RELIANCE.NS', '2026-02-06 15:05:00', 25, 2587.20, 2587.70, 2587.45, 1.8, 8500),
('TCS.NS', '2026-02-06 15:05:00', 25, 4156.00, 4156.60, 4156.30, 1.2, 4200),
('HDFCBANK.NS', '2026-02-06 15:05:00', 25, 1742.50, 1743.20, 1742.85, 1.5, 11000),
('INFY.NS', '2026-02-06 15:05:00', 25, 1875.90, 1876.50, 1876.20, 1.3, 9800),
('ICICIBANK.NS', '2026-02-06 15:05:00', 25, 1298.40, 1299.10, 1298.75, 1.7, 13500),
('HINDUNILVR.NS', '2026-02-06 15:05:00', 25, 2456.50, 2457.30, 2456.90, 1.0, 3800),
('ITC.NS', '2026-02-06 15:05:00', 25, 468.20, 468.50, 468.35, 0.9, 24000),
('SBIN.NS', '2026-02-06 15:05:00', 25, 826.20, 826.80, 826.50, 2.2, 18000),
('BHARTIARTL.NS', '2026-02-06 15:05:00', 25, 1705.30, 1705.90, 1705.60, 1.4, 9200),
('BAJFINANCE.NS', '2026-02-06 15:05:00', 25, 7233.50, 7235.00, 7234.25, 2.1, 1800),
('KOTAKBANK.NS', '2026-02-06 15:05:00', 25, 1798.00, 1798.80, 1798.40, 1.6, 7500),
('LT.NS', '2026-02-06 15:05:00', 25, 3642.20, 3643.20, 3642.70, 1.9, 4100),
('ASIANPAINT.NS', '2026-02-06 15:05:00', 25, 2876.00, 2877.10, 2876.55, 1.4, 3200),
('AXISBANK.NS', '2026-02-06 15:05:00', 25, 1142.00, 1142.60, 1142.30, 1.8, 10500),
('MARUTI.NS', '2026-02-06 15:05:00', 25, 12455.50, 12458.10, 12456.80, 1.7, 950),
('SUNPHARMA.NS', '2026-02-06 15:05:00', 25, 1797.90, 1798.60, 1798.25, 1.5, 6800),
('TITAN.NS', '2026-02-06 15:05:00', 25, 3487.40, 3488.40, 3487.90, 1.6, 3500),
('ULTRACEMCO.NS', '2026-02-06 15:05:00', 25, 11233.00, 11236.30, 11234.65, 1.5, 780),
('NESTLEIND.NS', '2026-02-06 15:05:00', 25, 2586.90, 2587.90, 2587.40, 0.8, 2100),
('WIPRO.NS', '2026-02-06 15:05:00', 25, 578.40, 578.90, 578.65, 1.4, 15000),
('HCLTECH.NS', '2026-02-06 15:05:00', 25, 1876.00, 1876.70, 1876.35, 1.3, 6200),
('TECHM.NS', '2026-02-06 15:05:00', 25, 1687.20, 1687.80, 1687.50, 1.5, 5400),
('BAJAJFINSV.NS', '2026-02-06 15:05:00', 25, 1698.40, 1699.10, 1698.75, 1.8, 4900),
('POWERGRID.NS', '2026-02-06 15:05:00', 25, 324.70, 325.00, 324.85, 1.1, 28000),
('NTPC.NS', '2026-02-06 15:05:00', 25, 356.75, 357.05, 356.90, 1.3, 32000),
('TATAMOTORS.NS', '2026-02-06 15:05:00', 25, 987.10, 987.80, 987.45, 2.8, 12000),
('TATASTEEL.NS', '2026-02-06 15:05:00', 25, 154.50, 154.70, 154.60, 2.6, 45000),
('ADANIPORTS.NS', '2026-02-06 15:05:00', 25, 1287.00, 1287.70, 1287.35, 2.3, 8900),
('ONGC.NS', '2026-02-06 15:05:00', 25, 287.35, 287.65, 287.50, 1.9, 38000),
('JSWSTEEL.NS', '2026-02-06 15:05:00', 25, 977.90, 978.60, 978.25, 2.4, 11500),
('HINDALCO.NS', '2026-02-06 15:05:00', 25, 645.50, 646.10, 645.80, 2.2, 17000),
('INDUSINDBK.NS', '2026-02-06 15:05:00', 25, 1456.50, 1457.30, 1456.90, 2.0, 7800),
('COALINDIA.NS', '2026-02-06 15:05:00', 25, 432.55, 432.95, 432.75, 1.6, 22000),
('M&M.NS', '2026-02-06 15:05:00', 25, 2987.10, 2988.10, 2987.60, 2.1, 3800),
('DIVISLAB.NS', '2026-02-06 15:05:00', 25, 5875.50, 5877.30, 5876.40, 1.5, 1650),
('CIPLA.NS', '2026-02-06 15:05:00', 25, 1465.50, 1466.20, 1465.85, 1.4, 5900),
('DRREDDY.NS', '2026-02-06 15:05:00', 25, 1298.30, 1299.10, 1298.70, 1.6, 6400),
('EICHERMOT.NS', '2026-02-06 15:05:00', 25, 4875.50, 4877.00, 4876.25, 1.8, 2100),
('GRASIM.NS', '2026-02-06 15:05:00', 25, 2654.40, 2655.40, 2654.90, 1.7, 3600),
('HEROMOTOCO.NS', '2026-02-06 15:05:00', 25, 4986.50, 4988.20, 4987.35, 1.6, 1900),
('SHREECEM.NS', '2026-02-06 15:05:00', 25, 27652.00, 27657.60, 27654.80, 1.4, 320),
('BRITANNIA.NS', '2026-02-06 15:05:00', 25, 5233.80, 5235.50, 5234.65, 1.2, 1750),
('APOLLOHOSP.NS', '2026-02-06 15:05:00', 25, 7122.50, 7124.40, 7123.45, 1.5, 1300),
('BAJAJ-AUTO.NS', '2026-02-06 15:05:00', 25, 9875.50, 9878.30, 9876.90, 1.7, 980),
('BPCL.NS', '2026-02-06 15:05:00', 25, 312.65, 313.05, 312.85, 2.0, 29000),
('ADANIENT.NS', '2026-02-06 15:05:00', 25, 2456.20, 2457.20, 2456.70, 2.9, 5200),
('SBILIFE.NS', '2026-02-06 15:05:00', 25, 1587.00, 1587.80, 1587.40, 1.3, 5600),
('HDFCLIFE.NS', '2026-02-06 15:05:00', 25, 687.00, 687.50, 687.25, 1.4, 13500),
('TATACONSUM.NS', '2026-02-06 15:05:00', 25, 1087.30, 1087.90, 1087.60, 1.5, 8200),
('LTIM.NS', '2026-02-06 15:05:00', 25, 6234.00, 6235.70, 6234.85, 1.6, 1450),

-- Mid Cap - Higher volatility, wider spreads
('ADANIGREEN.NS', '2026-02-06 15:05:00', 25, 1875.80, 1877.00, 1876.40, 3.2, 4800),
('BANKBARODA.NS', '2026-02-06 15:05:00', 25, 245.60, 246.00, 245.80, 2.5, 35000),
('BERGEPAINT.NS', '2026-02-06 15:05:00', 25, 487.60, 488.20, 487.90, 1.8, 16000),
('DLF.NS', '2026-02-06 15:05:00', 25, 876.00, 876.90, 876.45, 2.4, 10500),
('GODREJCP.NS', '2026-02-06 15:05:00', 25, 1187.20, 1188.10, 1187.65, 1.7, 7200),
('INDIGO.NS', '2026-02-06 15:05:00', 25, 4566.90, 4568.70, 4567.80, 2.3, 2100),
('MARICO.NS', '2026-02-06 15:05:00', 25, 634.20, 634.80, 634.50, 1.4, 14000),
('PIDILITIND.NS', '2026-02-06 15:05:00', 25, 3186.80, 3188.00, 3187.40, 1.6, 2800),
('SIEMENS.NS', '2026-02-06 15:05:00', 25, 7653.80, 7656.00, 7654.90, 1.8, 1150),
('DABUR.NS', '2026-02-06 15:05:00', 25, 498.50, 499.00, 498.75, 1.3, 17500),
('HAVELLS.NS', '2026-02-06 15:05:00', 25, 1697.80, 1698.80, 1698.30, 1.9, 5100),
('CHOLAFIN.NS', '2026-02-06 15:05:00', 25, 1354.20, 1355.00, 1354.60, 2.1, 6700),
('COLPAL.NS', '2026-02-06 15:05:00', 25, 2987.20, 2988.50, 2987.85, 1.2, 2900),
('GAIL.NS', '2026-02-06 15:05:00', 25, 198.30, 198.60, 198.45, 1.8, 42000),
('IOC.NS', '2026-02-06 15:05:00', 25, 143.60, 143.80, 143.70, 2.0, 58000),
('IRCTC.NS', '2026-02-06 15:05:00', 25, 876.40, 877.40, 876.90, 2.7, 10800),
('PFC.NS', '2026-02-06 15:05:00', 25, 487.00, 487.50, 487.25, 1.9, 18500),
('PNB.NS', '2026-02-06 15:05:00', 25, 107.75, 107.95, 107.85, 2.6, 78000),

-- Small Cap / New Age - High volatility, wider spreads
('ZOMATO.NS', '2026-02-06 15:05:00', 25, 267.40, 268.20, 267.80, 3.8, 32000),
('PAYTM.NS', '2026-02-06 15:05:00', 25, 986.80, 988.10, 987.45, 4.2, 8900),
('NYKAA.NS', '2026-02-06 15:05:00', 25, 187.30, 188.00, 187.65, 3.5, 42000),
('DELHIVERY.NS', '2026-02-06 15:05:00', 25, 354.40, 355.20, 354.80, 3.9, 24000),
('POLICYBZR.NS', '2026-02-06 15:05:00', 25, 1876.20, 1877.60, 1876.90, 3.6, 4200);

-- ========================================
-- INSERTS: DEMO ORDERS (Realistic Scenarios)
-- ========================================
INSERT INTO order_data (symbol, cpty_id, side, size, order_notes, arrival_time, submission_status) VALUES
('RELIANCE.NS', 'GS_NY_001', 'Buy', 150000, 'EOD compliance required - must attain position by close', '2026-02-06 15:05:00', 'Draft'),
('INFY.NS', 'VAN_US_007', 'Buy', 75000, 'VWAP must complete by 2pm - patient execution preferred', '2026-02-06 09:30:00', 'Draft'),
('HDFCBANK.NS', 'CITADEL_017', 'Buy', 200000, 'Urgent buy - critical allocation for fund rebalancing', '2026-02-06 14:00:00', 'Draft'),
('TCS.NS', 'CALPERS_021', 'Buy', 30000, 'Patient accumulation - no rush, optimize price', '2026-02-06 10:00:00', 'Draft'),
('SBIN.NS', 'JPM_LON_002', 'Sell', 100000, 'Must liquidate by close - regulatory requirement', '2026-02-06 15:05:00', 'Draft'),
('TATAMOTORS.NS', 'JUMP_041', 'Buy', 250000, 'Immediate - market impact acceptable', '2026-02-06 14:30:00', 'Draft'),
('ZOMATO.NS', 'TIGER_038', 'Sell', 500000, 'TWAP over next 2 hours', '2026-02-06 13:00:00', 'Draft'),
('BAJFINANCE.NS', 'BLK_US_006', 'Buy', 50000, 'VWAP benchmark - standard execution', '2026-02-06 11:00:00', 'Draft');

SELECT '✅ Schema + realistic data loaded - 50 clients, 70+ symbols' AS status;