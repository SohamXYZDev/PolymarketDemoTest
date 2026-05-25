import { Logger } from '../logger';
import { GammaApi, Market as GammaMarket } from '../api/gammaApi';
import { ClobApiClient } from '../api/clobApi';
import { PolymarketConfig } from '../config';
import {
  calculateTradeFees,
  calculateSlippageAdjustedPrice,
  calculateTruePnL,
  formatFeeBreakdown,
} from '../trading/feesCalculator';

export interface TradeSignal {
  marketId: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  reason: string;
  confidence: number;
}

export interface StrategyResult {
  signal: TradeSignal | null;
  analysis: {
    targetPrice: number;
    actualPrice: number;
    bidAskSpread: number;
    entryFees: {
      orderValue: number;
      takerFee: number;
      gasCost: number;
      totalCost: number;
    };
    recommendation: string;
    realisticMode: boolean;
  };
}

/**
 * Simple demo strategy that:
 * 1. Fetches active markets
 * 2. Analyzes bid-ask spread
 * 3. Generates buy signals for markets with good spreads
 * 4. Simulates trades (doesn't execute without confirmation)
 */
export class StrategyEngine {
  private gammaApi: GammaApi;
  private clobApi: ClobApiClient;
  private logger: Logger;
  private config: PolymarketConfig;

  constructor(
    gammaApi: GammaApi,
    clobApi: ClobApiClient,
    config: PolymarketConfig,
    logger: Logger
  ) {
    this.gammaApi = gammaApi;
    this.clobApi = clobApi;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Find attractive markets based on spread analysis
   */
  async findOpportunities(): Promise<TradeSignal[]> {
    try {
      this.logger.info('Analyzing market opportunities');

      // Fetch active markets
      const markets = await this.gammaApi.getMarkets({
        active: true,
        closed: false,
        limit: 20,
      });

      if (markets.length === 0) {
        this.logger.warn('No active markets found');
        return [];
      }

      this.logger.debug('Analyzing markets', { count: markets.length });

      const signals: TradeSignal[] = [];

      for (const market of markets) {
        const signal = await this.analyzeMarket(market);
        if (signal) {
          signals.push(signal);
        }
      }

      this.logger.info('Market analysis complete', { signals: signals.length });
      return signals;
    } catch (error) {
      this.logger.error('Failed to find opportunities', error);
      return [];
    }
  }

  /**
   * Analyze a single market
   */
  private async analyzeMarket(market: GammaMarket): Promise<TradeSignal | null> {
    try {
      // Calculate bid-ask spread
      const bidAskSpread = market.pricing.ask - market.pricing.bid;
      const midPrice = (market.pricing.bid + market.pricing.ask) / 2;
      const spreadPercent = (bidAskSpread / midPrice) * 100;

      this.logger.debug('Market analysis', {
        question: market.question.substring(0, 50),
        bid: market.pricing.bid,
        ask: market.pricing.ask,
        spreadPercent: spreadPercent.toFixed(2),
      });

      // Signal: Markets with tight spreads (< 2%) are good entry points
      if (spreadPercent < 2 && midPrice < this.config.priceTarget) {
        const tokenId = market.clobTokenIds[0]; // Use YES token

        return {
          marketId: market.id,
          tokenId,
          side: 'BUY',
          price: market.pricing.ask + 0.01, // Buy slightly above ask
          size: this.config.tradeSize,
          reason: `Good spread (${spreadPercent.toFixed(2)}%) and price (${midPrice}) below target (${this.config.priceTarget})`,
          confidence: 0.7,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to analyze market', { marketId: market.id, error });
      return null;
    }
  }

  /**
   * Simulate a trade with realistic fees and optional slippage
   */
  async simulateTrade(signal: TradeSignal): Promise<StrategyResult> {
    try {
      this.logger.info('Simulating trade', {
        marketId: signal.marketId.substring(0, 8),
        side: signal.side,
        price: signal.price,
        size: signal.size,
        realisticMode: this.config.enableRealisticSlippage,
      });

      // Calculate fees (always included - real costs)
      const entryFees = calculateTradeFees(
        signal.size,
        signal.price,
        'crypto', // Default to crypto category for demo
        'place'
      );

      // Calculate exit fees (for PnL estimate)
      const exitPrice = signal.price + 0.02; // Assume 2 cent profit target
      const exitFees = calculateTradeFees(signal.size, exitPrice, 'crypto', 'place');

      // Apply slippage if realistic mode enabled
      let actualEntryPrice = signal.price;
      const bidAskSpread = 0.02; // Assumed spread for simulation

      if (this.config.enableRealisticSlippage) {
        actualEntryPrice = calculateSlippageAdjustedPrice(
          signal.price,
          bidAskSpread,
          signal.side as 'BUY' | 'SELL'
        );

        this.logger.debug('Slippage applied', {
          targetPrice: signal.price,
          actualPrice: actualEntryPrice,
          slippageAmount: Math.abs(actualEntryPrice - signal.price),
        });
      }

      // Calculate true P&L
      const pnl = calculateTruePnL(actualEntryPrice, exitPrice, signal.size, entryFees.totalCost, exitFees.totalCost);

      const analysis = {
        targetPrice: signal.price,
        actualPrice: actualEntryPrice,
        bidAskSpread,
        entryFees: {
          orderValue: entryFees.orderValue,
          takerFee: entryFees.takerFee,
          gasCost: entryFees.gasCost,
          totalCost: entryFees.totalCost,
        },
        recommendation: this.generateRecommendation(signal, actualEntryPrice, pnl, this.config.enableRealisticSlippage),
        realisticMode: this.config.enableRealisticSlippage,
      };

      this.logger.info('Trade simulation complete', {
        entryPrice: actualEntryPrice,
        fees: entryFees.totalCost,
        estimatedPnL: pnl.netProfit,
      });

      return {
        signal,
        analysis,
      };
    } catch (error) {
      this.logger.error('Failed to simulate trade', error);
      return {
        signal: null,
        analysis: {
          targetPrice: 0,
          actualPrice: 0,
          bidAskSpread: 0,
          entryFees: {
            orderValue: 0,
            takerFee: 0,
            gasCost: 0,
            totalCost: 0,
          },
          recommendation: 'Trade simulation failed',
          realisticMode: false,
        },
      };
    }
  }

  /**
   * Generate recommendation based on simulation
   */
  private generateRecommendation(
    signal: TradeSignal,
    actualPrice: number,
    pnl: any,
    realisticMode: boolean
  ): string {
    const mode = realisticMode ? '(realistic with slippage)' : '(simplified)';
    return (
      `${signal.side} ${signal.size} at $${actualPrice.toFixed(4)} ${mode}\n` +
      `Entry: $${(signal.size * actualPrice).toFixed(2)}\n` +
      `Est. P&L: ${pnl.netProfit >= 0 ? '+' : ''}$${pnl.netProfit.toFixed(2)} (${pnl.netROI.toFixed(2)}% ROI)\n` +
      `Reason: ${signal.reason}`
    );
  }

  /**
   * Execute a trade (REQUIRES USER CONFIRMATION)
   */
  async executeTrade(signal: TradeSignal): Promise<{ orderId: string; success: boolean }> {
    try {
      this.logger.warn('EXECUTING REAL TRADE - This uses real funds!', {
        marketId: signal.marketId,
        side: signal.side,
        size: signal.size,
        price: signal.price,
      });

      // Place the order
      const response = await this.clobApi.placeOrder({
        tokenID: signal.tokenId,
        price: signal.price,
        size: signal.size,
        side: signal.side,
        tickSize: '0.01',
        negRisk: false,
      });

      return {
        orderId: response.orderID,
        success: response.status === 'SUCCESS',
      };
    } catch (error) {
      this.logger.error('Trade execution failed', error);
      return {
        orderId: '',
        success: false,
      };
    }
  }

  /**
   * Get portfolio summary (simulated)
   */
  getPortfolioSummary(): {
    balance: number;
    positions: number;
    unrealizedPnL: number;
    totalValue: number;
  } {
    // In a real scenario, this would fetch actual user positions
    return {
      balance: this.config.demoBalance,
      positions: 0,
      unrealizedPnL: 0,
      totalValue: this.config.demoBalance,
    };
  }
}
