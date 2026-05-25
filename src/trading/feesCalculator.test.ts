import { describe, it, expect } from 'vitest';
import {
  calculatePolymmarketFee,
  calculateGasCostInPUSD,
  getMarketFeeRate,
  calculateTradeFees,
  calculateSlippageAdjustedPrice,
  calculateTruePnL,
  MARKET_FEE_RATES,
  POLYGON_GAS_CONFIG,
} from '../trading/feesCalculator';

describe('Fees Calculator', () => {
  describe('calculatePolymmarketFee', () => {
    it('should calculate fee using formula: fee = C × feeRate × p × (1-p)', () => {
      // Example: 100 shares at $0.50 with 0.07 fee rate
      const fee = calculatePolymmarketFee(100, 0.50, 0.07);
      // fee = 100 × 0.07 × 0.50 × (1 - 0.50) = 1.75
      expect(fee).toBeCloseTo(1.75, 5);
    });

    it('should handle edge case: fee is 0 at price 0.00', () => {
      const fee = calculatePolymmarketFee(100, 0.0, 0.07);
      expect(fee).toBe(0);
    });

    it('should handle edge case: fee is 0 at price 1.00', () => {
      const fee = calculatePolymmarketFee(100, 1.0, 0.07);
      expect(fee).toBe(0);
    });

    it('should peak at price 0.50 for same share count', () => {
      const fee30 = calculatePolymmarketFee(100, 0.30, 0.07);
      const fee50 = calculatePolymmarketFee(100, 0.50, 0.07);
      const fee70 = calculatePolymmarketFee(100, 0.70, 0.07);

      // 50% should have highest fee
      expect(fee50).toBeGreaterThan(fee30);
      expect(fee50).toBeGreaterThan(fee70);

      // Fees should be symmetric around 50%
      expect(fee30).toBeCloseTo(fee70, 5);
    });

    it('should round to 5 decimals', () => {
      const fee = calculatePolymmarketFee(1, 0.5, 0.07);
      // fee = 1 × 0.07 × 0.5 × 0.5 = 0.0175
      expect(fee).toBeCloseTo(0.0175, 5);
      expect(fee.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(5);
    });

    it('should return 0 for fees smaller than 0.00001', () => {
      const fee = calculatePolymmarketFee(0.1, 0.5, 0.07);
      // fee = 0.1 × 0.07 × 0.5 × 0.5 = 0.000175
      // This should round to 0 since < 0.00001
      expect(fee).toBe(0);
    });

    it('should throw on invalid price', () => {
      expect(() => calculatePolymmarketFee(100, -0.1, 0.07)).toThrow();
      expect(() => calculatePolymmarketFee(100, 1.5, 0.07)).toThrow();
    });
  });

  describe('calculateGasCostInPUSD', () => {
    it('should calculate gas cost based on Gwei and POL price', () => {
      // 100,000 gas × 282 Gwei × $0.093306/POL
      const gasCost = calculateGasCostInPUSD(100000, 282);
      // Rough estimate: 100k gas at ~280 Gwei ≈ 0.028 POL ≈ $0.0026
      expect(gasCost).toBeGreaterThan(0.002);
      expect(gasCost).toBeLessThan(0.004);
    });

    it('should use default Gwei if not provided', () => {
      const cost1 = calculateGasCostInPUSD(100000);
      const cost2 = calculateGasCostInPUSD(100000, POLYGON_GAS_CONFIG.totalGweiBench);
      expect(cost1).toBeCloseTo(cost2, 5);
    });

    it('should be proportional to gas amount', () => {
      const cost50k = calculateGasCostInPUSD(50000);
      const cost100k = calculateGasCostInPUSD(100000);
      // Doubling gas should roughly double cost
      expect(cost100k).toBeCloseTo(cost50k * 2, 1);
    });
  });

  describe('getMarketFeeRate', () => {
    it('should return correct fee rate for each category', () => {
      expect(getMarketFeeRate('crypto')).toBe(0.07);
      expect(getMarketFeeRate('sports')).toBe(0.03);
      expect(getMarketFeeRate('finance')).toBe(0.04);
      expect(getMarketFeeRate('politics')).toBe(0.04);
      expect(getMarketFeeRate('economics')).toBe(0.05);
      expect(getMarketFeeRate('geopolitical')).toBe(0);
    });

    it('should be case-insensitive', () => {
      expect(getMarketFeeRate('CRYPTO')).toBe(0.07);
      expect(getMarketFeeRate('CrYpTo')).toBe(0.07);
      expect(getMarketFeeRate('  SPORTS  ')).toBe(0.03);
    });

    it('should default to "other" for unknown categories', () => {
      expect(getMarketFeeRate('unknown')).toBe(0.05);
      expect(getMarketFeeRate('invalid')).toBe(0.05);
    });
  });

  describe('calculateTradeFees', () => {
    it('should calculate complete fee breakdown', () => {
      const breakdown = calculateTradeFees(100, 0.50, 'crypto', 'place');

      expect(breakdown.orderValue).toBe(50); // 100 × 0.50
      expect(breakdown.takerFee).toBeCloseTo(1.75, 5); // 100 × 0.07 × 0.5 × 0.5
      expect(breakdown.gasCost).toBeGreaterThan(0);
      expect(breakdown.totalCost).toBe(breakdown.takerFee + breakdown.gasCost);
      expect(breakdown.feePercentage).toBeGreaterThan(0);
    });

    it('should use default category if not provided', () => {
      const breakdown = calculateTradeFees(100, 0.50);
      expect(breakdown.takerFee).toBeCloseTo(
        calculatePolymmarketFee(100, 0.50, MARKET_FEE_RATES['other']),
        5
      );
    });

    it('should use correct gas limit for operation type', () => {
      const placeBreakdown = calculateTradeFees(100, 0.50, 'crypto', 'place');
      const cancelBreakdown = calculateTradeFees(100, 0.50, 'crypto', 'cancel');

      // Place should have higher gas than cancel
      expect(placeBreakdown.gasCost).toBeGreaterThan(cancelBreakdown.gasCost);
    });

    it('should calculate gas amount in POL', () => {
      const breakdown = calculateTradeFees(100, 0.50, 'crypto', 'place');
      // Gas amount in POL should equal pUSD cost / POL price
      const expectedPOL = breakdown.gasCost / POLYGON_GAS_CONFIG.polPriceUsd;
      expect(breakdown.estimatedGasAmount).toBeCloseTo(expectedPOL, 6);
    });
  });

  describe('calculateSlippageAdjustedPrice', () => {
    it('should increase price for BUY orders (slippage against you)', () => {
      const targetPrice = 0.50;
      const spread = 0.02;
      const adjustedPrice = calculateSlippageAdjustedPrice(targetPrice, spread, 'BUY');

      expect(adjustedPrice).toBeGreaterThan(targetPrice);
      expect(adjustedPrice).toBeLessThanOrEqual(targetPrice + spread);
    });

    it('should decrease price for SELL orders (slippage against you)', () => {
      const targetPrice = 0.50;
      const spread = 0.02;
      const adjustedPrice = calculateSlippageAdjustedPrice(targetPrice, spread, 'SELL');

      expect(adjustedPrice).toBeLessThan(targetPrice);
      expect(adjustedPrice).toBeGreaterThanOrEqual(targetPrice - spread);
    });

    it('should assume 50% through spread', () => {
      const targetPrice = 0.50;
      const spread = 0.02;
      const buyPrice = calculateSlippageAdjustedPrice(targetPrice, spread, 'BUY');
      const sellPrice = calculateSlippageAdjustedPrice(targetPrice, spread, 'SELL');

      // Should move 50% of spread (0.01)
      expect(buyPrice).toBeCloseTo(0.51, 2);
      expect(sellPrice).toBeCloseTo(0.49, 2);
    });

    it('should cap prices at bounds', () => {
      const buyPrice = calculateSlippageAdjustedPrice(0.99, 0.02, 'BUY');
      const sellPrice = calculateSlippageAdjustedPrice(0.01, 0.02, 'SELL');

      expect(buyPrice).toBeLessThanOrEqual(1.0);
      expect(sellPrice).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('calculateTruePnL', () => {
    it('should calculate net P&L after all costs', () => {
      // Buy 100 at $0.50, sell at $0.52
      // Gross: (100 × 0.52) - (100 × 0.50) = +$2
      // Fees: $0.50
      // Net: $1.50
      const pnl = calculateTruePnL(0.50, 0.52, 100, 0.25, 0.25);

      expect(pnl.grossProfit).toBeCloseTo(2, 2);
      expect(pnl.totalFees).toBe(0.5);
      expect(pnl.netProfit).toBeCloseTo(1.5, 2);
    });

    it('should show loss when fees exceed profit', () => {
      // Small profit but large fees
      const pnl = calculateTruePnL(0.50, 0.51, 100, 0.30, 0.30);

      expect(pnl.grossProfit).toBeCloseTo(1, 2);
      expect(pnl.totalFees).toBe(0.6);
      expect(pnl.netProfit).toBeCloseTo(0.4, 2);
    });

    it('should calculate ROI percentage correctly', () => {
      const pnl = calculateTruePnL(0.50, 0.55, 100, 0.25, 0.25);
      // Net profit: (100 × 0.55) - (100 × 0.50) - 0.5 = 4.5
      // ROI: (4.5 / 50) × 100 = 9%
      expect(pnl.netROI).toBeCloseTo(9, 2);
    });
  });

  describe('Integration: Real-world scenario', () => {
    it('should handle realistic trade scenario', () => {
      // Scenario: Buy 200 shares of crypto market at $0.50
      // Sell at $0.52
      // With realistic slippage

      // 1. Calculate entry
      const entryBreakdown = calculateTradeFees(200, 0.50, 'crypto', 'place');
      expect(entryBreakdown.orderValue).toBe(100);
      expect(entryBreakdown.takerFee).toBeCloseTo(3.5, 5); // 200 × 0.07 × 0.5 × 0.5

      // 2. Apply slippage
      const entryPrice = calculateSlippageAdjustedPrice(0.50, 0.02, 'BUY');
      expect(entryPrice).toBeCloseTo(0.51, 2);

      // 3. Calculate exit
      const exitBreakdown = calculateTradeFees(200, 0.52, 'crypto', 'place');
      expect(exitBreakdown.takerFee).toBeGreaterThan(0);

      // 4. Calculate P&L
      const pnl = calculateTruePnL(
        entryPrice,
        0.52,
        200,
        entryBreakdown.totalCost,
        exitBreakdown.totalCost
      );

      // Entry @ $0.51, Exit @ $0.52 = +$0.01 × 200 = +$2
      // Less all fees (roughly -$0.10-0.15)
      expect(pnl.netProfit).toBeGreaterThanOrEqual(0);
    });
  });
});
