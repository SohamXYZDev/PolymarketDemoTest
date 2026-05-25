import { getConfig } from './config';
import { createLogger } from './logger';
import { GammaApi } from './api/gammaApi';
import { ClobApiClient } from './api/clobApi';
import { StrategyEngine } from './strategy/strategyEngine';
import * as readline from 'readline';

/**
 * Main entry point for the Polymarket Demo Test application
 */
async function main(): Promise<void> {
  const config = getConfig();
  const logger = createLogger(config);

  logger.info('🚀 Polymarket Demo Test Starting', {
    strategy: config.strategyName,
    demoBalance: config.demoBalance,
    environment: config.nodeEnv,
  });

  try {
    // Initialize APIs
    logger.info('Initializing APIs...');
    const gammaApi = new GammaApi(config.gammaApiBaseUrl, logger);
    const clobApi = new ClobApiClient(config, logger);

    // Check health
    const gammaHealthy = await gammaApi.healthCheck();
    const clobHealthy = await clobApi.healthCheck();

    if (!gammaHealthy) {
      logger.warn('Gamma API health check failed');
    }
    if (!clobHealthy) {
      logger.warn('CLOB API health check failed - will initialize on first use');
    }

    // Initialize CLOB client (requires L1 auth)
    logger.info('Setting up CLOB client with L1 authentication...');
    await clobApi.initialize();

    // Initialize strategy engine
    const strategy = new StrategyEngine(gammaApi, clobApi, config, logger);

    // Run analysis
    logger.info('Running market analysis...');
    const opportunities = await strategy.findOpportunities();

    if (opportunities.length === 0) {
      logger.info('No trading opportunities found based on current strategy');
      return;
    }

    logger.info(`Found ${opportunities.length} trading opportunities`, {
      opportunities: opportunities.map((o) => ({
        marketId: o.marketId.substring(0, 8),
        reason: o.reason,
        confidence: o.confidence,
      })),
    });

    // Simulate first opportunity
    if (opportunities.length > 0) {
      const topSignal = opportunities[0];

      logger.info('Simulating top trade opportunity...');
      const simulation = await strategy.simulateTrade(topSignal);

      logger.info('Simulation Result:', {
        recommendation: simulation.analysis.recommendation,
        marketId: topSignal.marketId,
      });

      // Show portfolio
      const portfolio = strategy.getPortfolioSummary();
      logger.info('Portfolio Summary:', portfolio);

      // Interactive prompt for actual trading
      if (config.nodeEnv === 'development') {
        const shouldExecute = await askQuestion(
          '\n⚠️  REAL TRADE: Execute this trade with ACTUAL FUNDS? (yes/no): '
        );

        if (shouldExecute.toLowerCase() === 'yes') {
          logger.warn('Executing trade with real funds!');
          const result = await strategy.executeTrade(topSignal);

          if (result.success) {
            logger.info('✅ Trade executed successfully!', { orderId: result.orderId });
          } else {
            logger.error('❌ Trade execution failed');
          }
        } else {
          logger.info('Trade cancelled - no funds were used');
        }
      }
    }

    logger.info('✅ Demo test complete');
  } catch (error) {
    logger.error('Fatal error', error);
    process.exit(1);
  }
}

/**
 * Helper function for interactive prompts
 */
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run the application
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
