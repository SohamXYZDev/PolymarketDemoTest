/**
 * Polymarket Demo Test - Advanced Strategy Example
 *
 * This example shows how to create a custom trading strategy that:
 * 1. Fetches multiple markets
 * 2. Applies custom analysis logic
 * 3. Ranks opportunities by multiple factors
 * 4. Implements risk management
 */

import { getConfig } from '../src/config';
import { createLogger } from '../src/logger';
import { GammaApi } from '../src/api/gammaApi';
import { ClobApiClient } from '../src/api/clobApi';

interface CustomSignal {
  marketId: string;
  tokenId: string;
  score: number;
  factors: {
    spreadsScore: number;
    volumeScore: number;
    volatilityScore: number;
  };
}

async function advancedStrategy() {
  const config = getConfig();
  const logger = createLogger(config);

  logger.info('Running Advanced Strategy...');

  try {
    const gammaApi = new GammaApi(config.gammaApiBaseUrl, logger);

    // Fetch multiple markets
    const markets = await gammaApi.getMarkets({
      active: true,
      closed: false,
      limit: 50,
    });

    logger.info(`Analyzing ${markets.length} markets...`);

    const signals: CustomSignal[] = [];

    for (const market of markets) {
      // Calculate spread score (lower spread = higher score)
      const midPrice = (market.pricing.bid + market.pricing.ask) / 2;
      const spread = market.pricing.ask - market.pricing.bid;
      const spreadPercent = (spread / midPrice) * 100;
      const spreadsScore = Math.max(0, 10 - spreadPercent * 5);

      // Calculate volume score (higher volume = higher score)
      const volumeScore = Math.min(10, market.volume / 100000);

      // Calculate volatility score based on bid-ask distance
      const volatilityScore = Math.min(10, spreadPercent * 2);

      // Combine scores with weights
      const totalScore =
        spreadsScore * 0.5 + // Spread is most important
        volumeScore * 0.3 + // Volume matters
        volatilityScore * 0.2; // Volatility as tiebreaker

      signals.push({
        marketId: market.id,
        tokenId: market.clobTokenIds[0],
        score: totalScore,
        factors: {
          spreadsScore,
          volumeScore,
          volatilityScore,
        },
      });
    }

    // Sort by score descending
    signals.sort((a, b) => b.score - a.score);

    // Show top 5 opportunities
    logger.info('Top 5 Opportunities:');
    signals.slice(0, 5).forEach((signal, i) => {
      logger.info(`${i + 1}. Score: ${signal.score.toFixed(2)}`, {
        spread: signal.factors.spreadsScore.toFixed(2),
        volume: signal.factors.volumeScore.toFixed(2),
        volatility: signal.factors.volatilityScore.toFixed(2),
      });
    });
  } catch (error) {
    logger.error('Error in advanced strategy', error);
  }
}

// Run the example
advancedStrategy().catch(console.error);
