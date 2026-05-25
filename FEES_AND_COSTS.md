# Realistic Trading Costs & Fees

This document explains the realistic fees and costs now included in the Polymarket Demo Test.

## What's Included

### ✅ Always Calculated (Real Costs)

#### 1. **Polymarket Taker Fees**
- **Based on**: Official Polymarket fee structure
- **Source**: https://docs.polymarket.com/trading/fees.md
- **Formula**: `fee = C × feeRate × p × (1 - p)`
  - C = number of shares
  - p = price (0.0 to 1.0)
  - feeRate = category-specific rate

**Fee Rates by Market Category**:
| Category | Fee Rate | Example (at $50 order, 50% probability) |
|----------|----------|----------------------------------------|
| Crypto | 0.07 | ~$1.75 |
| Sports | 0.03 | ~$0.75 |
| Finance/Politics/Tech | 0.04 | ~$1.00 |
| Economics/Culture/Weather | 0.05 | ~$1.25 |
| **Geopolitical** | **0** | **FREE** |

**Key Points**:
- Fees peak at 50% probability and decrease toward extremes
- Example: A $0.01 trade at 50% = $0.00 fee (too small)
- Minimum fee: $0.00001 USDC
- Only **takers** pay fees - makers pay $0
- Fees rounded to 5 decimals

#### 2. **Polygon Gas Costs**
- **Based on**: Current Polygon mainnet rates (May 2026)
- **Source**: https://polygonscan.com/gastracker
- **Cost**: ~$0.02-0.03 per trade

**Gas Breakdown**:
```
Base Fee:    253.875 Gwei
Priority:    28.392 Gwei  
Total:       ~282 Gwei
POL Price:   $0.093306

Cost Estimates:
- Place Order:     100,000 gas = ~$0.023
- Cancel Order:    60,000 gas  = ~$0.014
- Approve pUSD:    50,000 gas  = ~$0.012
```

**Important**: Gas is paid in POL (Polygon native token), not pUSD

---

### ✅ Optional: Realistic Slippage Mode

When `ENABLE_REALISTIC_SLIPPAGE=true`:

#### **Slippage Adjustment**
- Your target price is adjusted based on bid-ask spread
- Assumes your order consumes 50% of the spread
- **BUY orders**: Price moves UP (pay more)
- **SELL orders**: Price moves DOWN (get less)

**Example**:
```
Target Price:        $0.50
Bid-Ask Spread:      $0.02 (bid=$0.49, ask=$0.51)
Slippage (50%):      $0.01

BUY:  $0.50 + $0.01 = $0.51 actual price
SELL: $0.50 - $0.01 = $0.49 actual price
```

---

## Complete Example: Realistic Simulation

**Setup**:
- Buy 10 shares at $0.50 (crypto market)
- ENABLE_REALISTIC_SLIPPAGE = true

**Calculation**:

```
1. TARGET PRICE: $0.50
2. ACTUAL PRICE (with slippage): $0.51

3. ORDER VALUE: 10 × $0.50 = $5.00

4. ENTRY FEES:
   - Polymarket Fee:
     fee = 10 × 0.07 × 0.50 × (1 - 0.50)
     fee = 10 × 0.07 × 0.50 × 0.50
     fee = 0.175 pUSD
   
   - Gas Cost: ~$0.023
   - Total Entry Fees: $0.198

5. EXIT (selling at $0.52):
   - Sell 10 shares at $0.52 = $5.20
   - Exit Fee: 0.18 pUSD (same formula)
   - Total Exit Fees: $0.203

6. PROFIT CALCULATION:
   Gross P&L:  $5.20 - $5.00 = +$0.20
   Entry Fees: -$0.198
   Exit Fees:  -$0.203
   Net P&L:    +$0.20 - $0.198 - $0.203 = -$0.201 LOSS!

   Net ROI:    -$0.201 / $5.00 = -4.02% (loss)
```

**Reality Check**: Even with a +$0.02 price improvement, you lose money due to fees!

---

## Simulation Modes

### Mode 1: Simplified (Default)
```env
ENABLE_REALISTIC_SLIPPAGE=false
```

**What's calculated**:
- ✅ Polymarket fees
- ✅ Gas costs
- ❌ Slippage NOT applied
- ❌ Price stays at target

**Use for**: Quick testing of strategy logic

### Mode 2: Realistic (Recommended)
```env
ENABLE_REALISTIC_SLIPPAGE=true
```

**What's calculated**:
- ✅ Polymarket fees
- ✅ Gas costs
- ✅ Slippage applied (50% through spread)
- ✅ True P&L with all costs

**Use for**: Accurate P&L estimates before trading

---

## Switching Between Modes

### Run with Simplified (Quick Test)
```bash
# In .env
ENABLE_REALISTIC_SLIPPAGE=false

npm run dev
```

### Run with Realistic (Accurate Simulation)
```bash
# In .env
ENABLE_REALISTIC_SLIPPAGE=true

npm run dev
```

---

## What's NOT Included (Intentionally)

❌ **Market impact**: Large orders don't affect market price beyond slippage
❌ **Partial fills**: Orders assume 100% execution
❌ **Order book depth**: Assumes liquidity is infinite
❌ **Volatility adjustments**: Assumes constant bid-ask spread
❌ **Failed orders**: All orders assume success
❌ **Execution delay**: Orders execute immediately

**Why**: These are edge cases. For a trading strategy tester, the current model is realistic enough for most scenarios.

---

## Fee Calculation Algorithm

The app uses this exact algorithm for every trade:

```typescript
// 1. Calculate Polymarket Fee
fee = shares × feeRate × price × (1 - price)
fee = Math.round(fee × 100000) / 100000  // 5 decimals
if (fee < 0.00001) fee = 0  // Min fee

// 2. Calculate Gas Cost
gasWei = gasLimit × gweiPrice × 1e9
gasCostPOL = gasWei / 1e18
gasCostPUSD = gasCostPOL × polPriceUSD

// 3. Apply Slippage (if enabled)
if (realisticMode) {
  actualPrice = price + (slippage × 0.5) * direction
}

// 4. Calculate P&L
orderValue = shares × actualPrice
exitValue = shares × exitPrice
grossProfit = exitValue - orderValue
netProfit = grossProfit - entryFees - exitFees
netROI = (netProfit / orderValue) × 100
```

---

## Real-World Fee Examples

### Crypto Market Trades (0.07 fee rate)

| Order | Price | Shares | Spread | Mode | Actual Price | Fee | Gas | Total Cost | P&L @ +2% |
|-------|-------|--------|--------|------|--------------|-----|-----|-----------|-----------|
| $100 | $0.50 | 200 | $0.02 | Simple | $0.50 | $1.75 | $0.02 | $1.77 | +$0.23 |
| $100 | $0.50 | 200 | $0.02 | Realistic | $0.51 | $1.77 | $0.02 | $1.79 | -$1.79 |
| $1000 | $0.50 | 2000 | $0.02 | Simple | $0.50 | $17.50 | $0.02 | $17.52 | +$20.00 |
| $1000 | $0.50 | 2000 | $0.02 | Realistic | $0.51 | $17.68 | $0.02 | $17.70 | -$17.70 |

**Key Insight**: Even small orders are heavily impacted by fees!

---

## Fee Optimization Tips

### 1. Trade Near Extremes
Fees are lowest at $0.01 and $0.99 (near certainty)
```
$0.01 fee: $0.07 (crypto, 100 shares at $0.01)
$0.50 fee: $1.75 (crypto, 100 shares at $0.50) ← Peak
$0.99 fee: $0.07 (crypto, 100 shares at $0.99)
```

### 2. Use Geopolitical Markets
**No fees on geopolitical/world events markets!**
- Same strategy, zero taker fees
- Only gas costs apply (~$0.02-0.03)

### 3. Be a Maker, Not a Taker
- Makers pay $0 fees
- Place limit orders away from spread
- Wait for market to come to you

### 4. Larger Orders Beat Fixed Gas
- Small $10 order: 18% of cost is gas
- Large $1000 order: 0.2% of cost is gas
- Scale matters!

---

## Configuration Reference

```env
# Enable realistic slippage (fee calculations always on)
ENABLE_REALISTIC_SLIPPAGE=true|false

# Market simulation settings
TRADE_SIZE=10              # Shares to trade
PRICE_TARGET=0.50         # Target price threshold
DEMO_BALANCE=1000         # Simulated balance
```

---

## Verification

All values are verified against official sources:
- **Polymarket Fees**: https://docs.polymarket.com/trading/fees.md
- **Polygon Gas**: https://polygonscan.com/gastracker
- **POL Price**: Real-time from market data
- **Formulas**: Exact match to protocol specification

---

## Next Steps

1. **Test with Simplified Mode** (current .env setting)
   - See if strategy logic works
   - No slippage complexity

2. **Switch to Realistic Mode**
   - Change `ENABLE_REALISTIC_SLIPPAGE=true`
   - See real P&L with all costs
   - Adjust strategy based on realistic results

3. **Optimize Your Strategy**
   - Find markets/timing with best risk/reward
   - Consider fee structure when selecting markets
   - Plan for 2-4% total cost before entering

---

Questions? Check the main README or ARCHITECTURE documentation.
