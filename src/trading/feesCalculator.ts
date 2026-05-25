/**
 * Polymarket Fee and Cost Calculator
 * Based on official Polymarket documentation:
 * - Fees: https://docs.polymarket.com/trading/fees.md
 * - Gas: Polygon mainnet current rates
 */

/**
 * Market categories with their taker fee rates
 * Formula: fee = C × feeRate × p × (1 - p)
 * Where:
 *   C = number of shares
 *   p = price (0.0 to 1.0)
 *   feeRate = category-specific rate
 */
export const MARKET_FEE_RATES: Record<string, number> = {
  'crypto': 0.07, // 7% equivalent
  'sports': 0.03, // 3% equivalent
  'finance': 0.04, // 4% equivalent
  'politics': 0.04,
  'mentions': 0.04,
  'tech': 0.04,
  'economics': 0.05, // 5% equivalent
  'culture': 0.05,
  'weather': 0.05,
  'other': 0.05,
  'general': 0.05,
  'geopolitical': 0, // FREE! No fees on geopolitical/world events
};

/**
 * Polygon network gas costs
 * Current mainnet rates (May 2026):
 * - Base fee: ~253 Gwei
 * - Priority fee: ~28 Gwei
 * - Total: ~280-300 Gwei
 * - POL price: ~$0.093
 */
export const POLYGON_GAS_CONFIG = {
  baseFeatureGwei: 253.875,
  priorityFeeGwei: 28.392,
  totalGweiBench: 282.267, // Standard speed
  polPriceUsd: 0.093306,
  // Estimated gas for Polymarket operations
  orderPlacementGas: 100000, // ~place order
  orderCancellationGas: 60000, // ~cancel order
  approvePUSDGas: 50000, // ~approve pUSD transfer
};

export interface FeeBreakdown {
  orderValue: number; // Total value of trade (shares × price)
  takerFee: number; // Polymarket taker fee in pUSD
  gasCost: number; // Polygon gas cost in pUSD
  totalCost: number; // takerFee + gasCost
  totalWithOrderValue: number; // Full cost including order value
  estimatedGasAmount: number; // How many POL needed
  feePercentage: number; // Fee as % of order value
}

/**
 * Calculate Polymarket taker fee using official formula
 * Formula: fee = C × feeRate × p × (1 - p)
 *
 * @param shares - Number of shares
 * @param price - Price (0.0 to 1.0)
 * @param feeRate - Category fee rate (0.03 to 0.07)
 * @returns Fee in pUSD, rounded to 5 decimals (minimum 0.00001)
 */
export function calculatePolymmarketFee(
  shares: number,
  price: number,
  feeRate: number
): number {
  // Validate inputs
  if (price < 0 || price > 1) {
    throw new Error('Price must be between 0 and 1');
  }

  // Calculate using official formula
  const fee = shares * feeRate * price * (1 - price);

  // Round to 5 decimals as per Polymarket spec
  const rounded = Math.round(fee * 100000) / 100000;

  // Minimum fee is 0.00001 USDC, anything smaller = 0
  return rounded < 0.00001 ? 0 : rounded;
}

/**
 * Calculate Polygon gas cost in pUSD
 *
 * @param gasLimit - Gas amount needed
 * @param gweiBench - Gwei price benchmark (default: current standard)
 * @returns Cost in pUSD
 */
export function calculateGasCostInPUSD(
  gasLimit: number,
  gweiBench: number = POLYGON_GAS_CONFIG.totalGweiBench
): number {
  // Convert Gwei to Wei: 1 Gwei = 1e9 Wei
  const gasCostInWei = BigInt(Math.floor(gasLimit)) * BigInt(Math.floor(gweiBench * 1e9));

  // Convert Wei to POL: 1 POL = 1e18 Wei
  const gasCostInPOL = Number(gasCostInWei) / 1e18;

  // Convert POL to pUSD at current rate
  const gasCostInPUSD = gasCostInPOL * POLYGON_GAS_CONFIG.polPriceUsd;

  return Math.round(gasCostInPUSD * 100000) / 100000;
}

/**
 * Get the fee rate for a market category
 * Default to "other" if category not found
 */
export function getMarketFeeRate(marketCategory: string): number {
  const normalized = marketCategory.toLowerCase().trim();
  return MARKET_FEE_RATES[normalized] ?? MARKET_FEE_RATES['other'];
}

/**
 * Calculate complete fee breakdown for a trade
 *
 * @param shares - Shares to trade
 * @param price - Price per share
 * @param marketCategory - Market category (determines fee rate)
 * @param operationType - 'place' or 'cancel' (determines gas)
 * @returns Complete fee breakdown
 */
export function calculateTradeFees(
  shares: number,
  price: number,
  marketCategory: string = 'other',
  operationType: 'place' | 'cancel' = 'place'
): FeeBreakdown {
  const feeRate = getMarketFeeRate(marketCategory);
  const takerFee = calculatePolymmarketFee(shares, price, feeRate);

  // Calculate gas based on operation
  const gasLimit =
    operationType === 'place'
      ? POLYGON_GAS_CONFIG.orderPlacementGas
      : POLYGON_GAS_CONFIG.orderCancellationGas;

  const gasCost = calculateGasCostInPUSD(gasLimit);

  const orderValue = shares * price;
  const totalCost = takerFee + gasCost;
  const feePercentage = (totalCost / orderValue) * 100;

  return {
    orderValue,
    takerFee,
    gasCost,
    totalCost,
    totalWithOrderValue: orderValue + totalCost,
    estimatedGasAmount: (gasCost / POLYGON_GAS_CONFIG.polPriceUsd),
    feePercentage,
  };
}

/**
 * Simulate realistic slippage
 * Assumes order fills partially through the bid-ask spread
 *
 * @param targetPrice - Your target price
 * @param bidAskSpread - Current bid-ask spread (ask - bid)
 * @param side - 'BUY' or 'SELL'
 * @returns Actual fill price with slippage
 */
export function calculateSlippageAdjustedPrice(
  targetPrice: number,
  bidAskSpread: number,
  side: 'BUY' | 'SELL'
): number {
  // Large orders consume bid/ask, slippage increases with order size
  // Simplified model: 50% through the spread
  const slippageAmount = bidAskSpread * 0.5;

  if (side === 'BUY') {
    // Buying: price moves up (ask side)
    return Math.min(targetPrice + slippageAmount, 1.0);
  } else {
    // Selling: price moves down (bid side)
    return Math.max(targetPrice - slippageAmount, 0.0);
  }
}

/**
 * Calculate true P&L after all costs
 *
 * @param entryPrice - Entry price
 * @param exitPrice - Exit price
 * @param shares - Number of shares
 * @param entryFees - Fees paid on entry
 * @param exitFees - Fees paid on exit
 * @returns P&L with all costs included
 */
export function calculateTruePnL(
  entryPrice: number,
  exitPrice: number,
  shares: number,
  entryFees: number,
  exitFees: number
): {
  grossProfit: number;
  totalFees: number;
  netProfit: number;
  netROI: number;
} {
  const orderValue = shares * entryPrice;
  const exitValue = shares * exitPrice;

  const grossProfit = exitValue - orderValue;
  const totalFees = entryFees + exitFees;
  const netProfit = grossProfit - totalFees;
  const netROI = (netProfit / orderValue) * 100;

  return {
    grossProfit: Math.round(grossProfit * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netROI: Math.round(netROI * 100) / 100,
  };
}

/**
 * Format fees for display
 */
export function formatFeeBreakdown(breakdown: FeeBreakdown): string {
  return `
📊 Trade Cost Breakdown:
  Order Value: $${breakdown.orderValue.toFixed(2)}
  ├─ Polymarket Fee: $${breakdown.takerFee.toFixed(5)} (${((breakdown.takerFee / breakdown.orderValue) * 100).toFixed(2)}%)
  ├─ Gas Cost: $${breakdown.gasCost.toFixed(5)} (~${breakdown.estimatedGasAmount.toFixed(4)} POL)
  └─ Total Cost: $${breakdown.totalCost.toFixed(5)}
  
  Total with Order: $${breakdown.totalWithOrderValue.toFixed(2)}
  Cost as % of order: ${breakdown.feePercentage.toFixed(2)}%
`.trim();
}
