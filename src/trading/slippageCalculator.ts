import { Logger } from '../logger';

/**
 * Slippage Calculation
 *
 * Slippage = Difference between expected price and actual execution price
 *
 * Factors:
 * 1. Bid-Ask Spread: Half the spread is typical slippage
 * 2. Market Impact: Large orders move the price
 * 3. Latency: Network delay between quote and execution
 */

export interface SlippageEstimate {
  expectedPrice: number;
  actualPrice: number;
  slippageAmount: number;
  slippagePercent: number;
  isRealistic: boolean; // Whether realistic mode was used
}

export class SlippageCalculator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Calculate slippage for an order
   *
   * @param bidPrice - Current bid price
   * @param askPrice - Current ask price
   * @param orderSize - Size of order
   * @param side - BUY or SELL
   * @param isRealistic - Enable realistic slippage calculation
   * @returns Slippage estimate
   */
  calculateSlippage(
    bidPrice: number,
    askPrice: number,
    orderSize: number,
    side: 'BUY' | 'SELL',
    isRealistic: boolean = false
  ): SlippageEstimate {
    const midPrice = (bidPrice + askPrice) / 2;
    const spread = askPrice - bidPrice;

    if (!isRealistic) {
      // No slippage in simplified mode
      return {
        expectedPrice: side === 'BUY' ? askPrice : bidPrice,
        actualPrice: side === 'BUY' ? askPrice : bidPrice,
        slippageAmount: 0,
        slippagePercent: 0,
        isRealistic: false,
      };
    }

    // Realistic slippage calculation
    // Factor 1: Half the spread (typical market maker cost)
    const spreadSlippage = spread / 2;

    // Factor 2: Market impact based on order size
    // Larger orders move price more
    // Using formula: impact = spread × sqrt(orderSize / typical_volume)
    const typicalVolume = 1000; // Typical order size
    const marketImpact = spread * Math.sqrt(Math.min(orderSize / typicalVolume, 1));

    // Factor 3: Latency/volatility buffer (~0.1% for volatile markets)
    const latencyBuffer = midPrice * 0.001;

    // Total slippage
    const totalSlippage = spreadSlippage + marketImpact + latencyBuffer;

    // Apply slippage based on side
    const actualPrice = side === 'BUY' ? midPrice + totalSlippage : midPrice - totalSlippage;
    const slippageAmount = Math.abs(actualPrice - midPrice);
    const slippagePercent = (slippageAmount / midPrice) * 100;

    this.logger.debug('Slippage calculated', {
      expectedPrice: midPrice,
      actualPrice: actualPrice.toFixed(6),
      components: {
        spreadSlippage: spreadSlippage.toFixed(6),
        marketImpact: marketImpact.toFixed(6),
        latencyBuffer: latencyBuffer.toFixed(6),
      },
      slippagePercent: slippagePercent.toFixed(3),
      isRealistic: true,
    });

    return {
      expectedPrice: midPrice,
      actualPrice,
      slippageAmount,
      slippagePercent,
      isRealistic: true,
    };
  }

  /**
   * Format slippage for display
   */
  formatSlippage(slippage: SlippageEstimate): string {
    if (!slippage.isRealistic || slippage.slippageAmount === 0) {
      return 'No slippage (simplified mode)';
    }

    return (
      `Expected: $${slippage.expectedPrice.toFixed(6)} → ` +
      `Actual: $${slippage.actualPrice.toFixed(6)} ` +
      `(Slippage: $${slippage.slippageAmount.toFixed(6)}, ${slippage.slippagePercent.toFixed(3)}%)`
    );
  }
}
