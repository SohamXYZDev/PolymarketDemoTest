import { Logger } from '../logger';

/**
 * Polymarket Fee Structure (As of May 2026)
 * Based on: https://docs.polymarket.com/trading/fees
 *
 * Base fees vary by market type:
 * - Standard markets: 2% taker, 0% maker
 * - High volume markets: 1-2% taker, negative maker (rebates)
 * - Special markets: Can vary
 *
 * Polygon gas: ~0.5-2 MATIC per transaction (~$0.0005-0.002)
 */

export interface FeeCalculation {
  orderValue: number; // pUSD amount
  takerFeePercent: number; // e.g., 2 for 2%
  takerFeeAmount: number; // USD amount
  gasCostMATIC: number; // MATIC amount
  gasCostUSD: number; // USD equivalent (at ~$0.001 per MATIC)
  totalCost: number; // Fee + gas
  totalCostPercent: number; // Total cost as % of order value
}

export interface TradeWithCosts {
  entryPrice: number;
  entrySize: number;
  exitPrice: number;
  
  // Costs breakdown
  entryCost: FeeCalculation;
  exitCost: FeeCalculation;
  
  // Total PnL
  grossPnL: number; // Before fees and gas
  netPnL: number; // After fees and gas
  roiPercent: number; // Return on investment %
}

/**
 * Polymarket Fees - Based on actual documentation
 * Markets have different fee structures; using average base fee of 2%
 */
const POLYMARKET_FEES = {
  // Standard market fee structure (2% taker, 0% maker)
  standardTaker: 2, // percent
  standardMaker: 0, // percent (taker pays, maker gets credit)
  
  // High-volume market fees (1% taker, -0.5% maker rebate)
  highVolumeTaker: 1, // percent
  highVolumeMaker: -0.5, // percent (negative = rebate)
  
  // Conservative estimate for unknown markets
  conservativeTaker: 2, // percent
};

/**
 * Polygon Network Gas Costs (May 2026)
 * Standard order operations: ~500k-1M gas
 * At ~2 gwei: ~0.001-0.002 MATIC (~$0.001-0.002)
 * Using conservative estimate: 0.001 MATIC per trade
 */
const POLYGON_GAS = {
  gasPerTradeEstimate: 0.001, // MATIC (conservative)
  maticToUSDRate: 1, // $1 per MATIC (approximate)
};

export class FeeCalculator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Calculate fees for a single trade execution
   * @param orderValue - Size in pUSD
   * @param isMaker - Whether this is a maker or taker order
   * @param marketVolume - Market volume (for determining fee tier)
   * @returns Fee calculation details
   */
  calculateTradeFees(
    orderValue: number,
    isMaker: boolean = false,
    marketVolume: number = 10000 // Default: assume medium volume
  ): FeeCalculation {
    // Determine fee tier based on market volume
    const isHighVolume = marketVolume > 100000; // High volume threshold

    let feePercent: number;

    if (isHighVolume) {
      feePercent = isMaker ? POLYMARKET_FEES.highVolumeMaker : POLYMARKET_FEES.highVolumeTaker;
    } else {
      feePercent = isMaker ? POLYMARKET_FEES.standardMaker : POLYMARKET_FEES.standardTaker;
    }

    // Calculate fee amount
    const feeAmount = (orderValue * Math.abs(feePercent)) / 100;

    // Gas cost (fixed per trade)
    const gasCostMATIC = POLYGON_GAS.gasPerTradeEstimate;
    const gasCostUSD = gasCostMATIC * POLYGON_GAS.maticToUSDRate;

    // Total cost
    const totalCost = feeAmount + gasCostUSD;
    const totalCostPercent = (totalCost / orderValue) * 100;

    return {
      orderValue,
      takerFeePercent: feePercent,
      takerFeeAmount: feeAmount,
      gasCostMATIC,
      gasCostUSD,
      totalCost,
      totalCostPercent,
    };
  }

  /**
   * Calculate complete trade PnL including entry/exit fees and gas
   * Assumes taker (paying fees) on both sides
   */
  calculateRealisticPnL(
    entryPrice: number,
    exitPrice: number,
    size: number,
    marketVolume: number = 10000
  ): TradeWithCosts {
    const entryValue = entryPrice * size;
    const exitValue = exitPrice * size;

    // Calculate costs for entry (taker)
    const entryCost = this.calculateTradeFees(entryValue, false, marketVolume);

    // Calculate costs for exit (taker)
    const exitCost = this.calculateTradeFees(exitValue, false, marketVolume);

    // Gross profit (before fees)
    const grossPnL = exitValue - entryValue;

    // Net profit (after all fees and gas)
    const netPnL = grossPnL - entryCost.totalCost - exitCost.totalCost;

    // ROI calculation
    const totalCostBasis = entryValue + entryCost.totalCost;
    const roiPercent = (netPnL / totalCostBasis) * 100;

    return {
      entryPrice,
      entrySize: size,
      exitPrice,
      entryCost,
      exitCost,
      grossPnL,
      netPnL,
      roiPercent,
    };
  }

  /**
   * Get fee summary for logging
   */
  formatFeeSummary(calc: FeeCalculation): string {
    return (
      `Fee: $${calc.takerFeeAmount.toFixed(4)} (${calc.takerFeePercent}%) + ` +
      `Gas: $${calc.gasCostUSD.toFixed(4)} = Total: $${calc.totalCost.toFixed(4)} (${calc.totalCostPercent.toFixed(3)}%)`
    );
  }

  /**
   * Format complete PnL with costs
   */
  formatPnLSummary(trade: TradeWithCosts): string {
    return (
      `Entry: ${trade.entryPrice} × ${trade.entrySize} = $${(trade.entryPrice * trade.entrySize).toFixed(2)}\n` +
      `  ${this.formatFeeSummary(trade.entryCost)}\n` +
      `Exit: ${trade.exitPrice} × ${trade.entrySize} = $${(trade.exitPrice * trade.entrySize).toFixed(2)}\n` +
      `  ${this.formatFeeSummary(trade.exitCost)}\n` +
      `Gross PnL: $${trade.grossPnL.toFixed(4)}\n` +
      `Net PnL: $${trade.netPnL.toFixed(4)} (ROI: ${trade.roiPercent.toFixed(2)}%)`
    );
  }
}
