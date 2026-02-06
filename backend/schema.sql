-- ========================================
-- AUO HACKATHON MVP - MINIMAL SCHEMA
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
-- INSERTS: MARKET DATA (15 Symbols)
-- ========================================
INSERT INTO market_data
(symbol, snapshot_time, time_to_close, bid, ask, ltp, volatility_pct, avg_trade_size)
VALUES
('RELIANCE.NS',  '2026-02-06 15:05:00', 25, 2570.0, 2570.5, 2570.2, 2.1, 7500),
('INFY.NS',      '2026-02-06 15:05:00', 25, 1848.0, 1849.0, 1848.6, 1.4, 12000),
('TCS.NS',       '2026-02-06 15:05:00', 25, 4120.5, 4121.2, 4120.8, 1.1, 5000),
('HDFCBANK.NS',  '2026-02-06 15:05:00', 25, 1720.0, 1720.8, 1720.4, 1.8, 9000),
('ICICIBANK.NS', '2026-02-06 15:05:00', 25, 1285.2, 1286.0, 1285.6, 1.6, 11000),
('SBIN.NS',      '2026-02-06 15:05:00', 25, 812.0,  812.6,  812.3,  2.4, 15000),
('BHARTIARTL.NS','2026-02-06 15:05:00', 25, 1680.2, 1680.8, 1680.5, 1.3, 8000),
('ITC.NS',       '2026-02-06 15:05:00', 25, 465.0,  465.4,  465.2,  0.9, 20000),
('KOTAKBANK.NS', '2026-02-06 15:05:00', 25, 1895.5, 1896.2, 1895.8, 1.5, 6500),
('LT.NS',        '2026-02-06 15:05:00', 25, 3542.0, 3543.5, 3542.8, 1.7, 4200),
('HINDUNILVR.NS','2026-02-06 15:05:00', 25, 2680.5, 2681.2, 2680.8, 1.0, 5800),
('BAJFINANCE.NS','2026-02-06 15:05:00', 25, 7125.0, 7127.5, 7126.2, 2.8, 2500),
('MARUTI.NS',    '2026-02-06 15:05:00', 25, 12450.0,12453.0,12451.5, 2.2, 1800),
('ASIANPAINT.NS','2026-02-06 15:05:00', 25, 2890.0, 2891.5, 2890.7, 1.4, 4500),
('WIPRO.NS',     '2026-02-06 15:05:00', 25, 485.2,  485.8,  485.5,  1.6, 13000);

-- ========================================
-- INSERTS: CLIENT PROFILES (12 Clients)
-- ========================================
INSERT INTO client_profiles
(cpty_id, client_name, urgency_factor, price_sensitivity, execution_model)
VALUES
('Client_XYZ', 'XYZ Capital',              0.85, 'Low',  'Principal'),
('Client_GHI', 'GHI Partners',             0.70, 'Low',  'Principal'),
('Client_JKL', 'JKL Asset Management',     0.75, 'Low',  'Principal'),
('Client_STU', 'STU Institutional',        0.80, 'Low',  'Principal'),
('Client_ABC', 'ABC Asset Management',     0.50, 'High', 'Agency'),
('Client_DEF', 'DEF Securities',           0.30, 'High', 'Agency'),
('Client_MNO', 'MNO Investment Group',     0.55, 'High', 'Agency'),
('Client_PQR', 'PQR Fund Management',      0.45, 'High', 'Principal'),
('Client_VWX', 'VWX Long-Term Fund',       0.20, 'High', 'Agency'),
('Client_YZA', 'YZA Pension Fund',         0.15, 'High', 'Agency'),
('Client_BCD', 'BCD Endowment',            0.25, 'High', 'Agency'),
('Client_EFG', 'EFG Family Office',        0.35, 'High', 'Principal');

-- ========================================
-- INSERTS: DEMO ORDERS
-- ========================================
INSERT INTO order_data
(symbol, cpty_id, side, size, order_notes, arrival_time, submission_status)
VALUES
('RELIANCE.NS', 'Client_XYZ', 'Buy', 50000,
 'EOD compliance required - must attain position by close',
 '2026-02-06 15:05:00', 'Draft'),
('INFY.NS', 'Client_ABC', 'Buy', 75000,
 'VWAP must complete by 2pm - patient execution preferred',
 '2026-02-06 09:30:00', 'Draft'),
('HDFCBANK.NS', 'Client_GHI', 'Buy', 200000,
 'Urgent buy - critical allocation for fund rebalancing',
 '2026-02-06 14:00:00', 'Draft'),
('TCS.NS', 'Client_VWX', 'Buy', 30000,
 'Patient accumulation - no rush, optimize price',
 '2026-02-06 10:00:00', 'Draft'),
('SBIN.NS', 'Client_STU', 'Sell', 100000,
 'Must liquidate by close - regulatory requirement',
 '2026-02-06 15:05:00', 'Draft');

SELECT '✅ Schema + data loaded' AS status;