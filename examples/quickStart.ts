/**
 * Polymarket Demo Test - Quick Start Example
 *
 * This example shows how to:
 * 1. Fetch markets from Gamma API
 * 2. Analyze spreads
 * 3. Simulate trades
 * 4. (Optional) Execute real trades
 */

import { getConfig } from '../src/config';
import { createLogger } from '../src/logger';
import { GammaApi } from '../src/api/gammaApi';
import { ClobApiClient } from '../src/api/clobApi';
import { StrategyEngine } from '../src/strategy/strategyEngine';

async function quickStart() {
  // Load configuration
  const config = getConfig();
  const logger = createLogger(config);

  logger.info('Starting Polymarket Demo...');

  try {
    // Initialize APIs
    const gammaApi = new GammaApi(config.gammaApiBaseUrl, logger);
    const clobApi = new ClobApiClient(config, logger);

    // Initialize CLOB client (L1 authentication)
    await clobApi.initialize();

    // Create strategy engine
    const strategy = new StrategyEngine(gammaApi, clobApi, config, logger);

    // Find trading opportunities
    logger.info('Analyzing markets for opportunities...');
    const opportunities = await strategy.findOpportunities();

    if (opportunities.length === 0) {
      logger.info('No opportunities found');
      return;
    }

    // Show top opportunity
    const topSignal = opportunities[0];
    logger.info('Top opportunity found:', {
      marketId: topSignal.marketId,
      reason: topSignal.reason,
      confidence: topSignal.confidence,
    });

    // Simulate the trade
    logger.info('Simulating trade...');
    const simulation = await strategy.simulateTrade(topSignal);
    logger.info('Simulation result:', simulation.analysis);

    // Show portfolio
    const portfolio = strategy.getPortfolioSummary();
    logger.info('Portfolio:', portfolio);

    // To execute a real trade (uses real funds):
    // const result = await strategy.executeTrade(topSignal);
  } catch (error) {
    logger.error('Error:', error);
  }
}

// Run the example
quickStart().catch(console.error);
