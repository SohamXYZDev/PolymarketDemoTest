import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface PolymarketConfig {
  // API Configuration
  gammaApiBaseUrl: string;
  clobApiBaseUrl: string;
  dataApiBaseUrl: string;

  // Wallet Configuration
  privateKey: string;
  walletAddress: string;
  rpcUrl: string;

  // Polymarket Configuration
  chainId: number; // Polygon mainnet = 137

  // Strategy Configuration
  strategyName: string;
  demoBalance: number;
  tradeSize: number;
  priceTarget: number;
  
  // Realism Settings
  enableRealisticSlippage: boolean;

  // Application Settings
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  nodeEnv: 'development' | 'production' | 'test';

  // Optional API credentials (generated after L1 auth)
  apiKey?: string;
  apiSecret?: string;
  apiPassphrase?: string;
}

function validateEnv(): void {
  const required = ['PRIVATE_KEY', 'WALLET_ADDRESS'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please copy .env.example to .env and fill in the values.`
    );
  }

  // Validate private key format
  const pk = process.env.PRIVATE_KEY || '';
  if (!pk.startsWith('0x') || pk.length !== 66) {
    throw new Error(
      'PRIVATE_KEY must be a valid hex string starting with 0x (66 characters total)'
    );
  }

  // Validate wallet address format
  const addr = process.env.WALLET_ADDRESS || '';
  if (!addr.startsWith('0x') || addr.length !== 42) {
    throw new Error('WALLET_ADDRESS must be a valid Ethereum address (42 characters)');
  }
}

export function getConfig(): PolymarketConfig {
  validateEnv();

  return {
    // API Configuration
    gammaApiBaseUrl: process.env.GAMMA_API_BASE_URL || 'https://gamma-api.polymarket.com',
    clobApiBaseUrl: process.env.CLOB_API_BASE_URL || 'https://clob.polymarket.com',
    dataApiBaseUrl: process.env.DATA_API_BASE_URL || 'https://data-api.polymarket.com',

    // Wallet Configuration
    privateKey: process.env.PRIVATE_KEY as string,
    walletAddress: process.env.WALLET_ADDRESS as string,
    rpcUrl: process.env.RPC_URL || 'https://polygon-rpc.com',

    // Polymarket Configuration
    chainId: 137, // Polygon mainnet

    // Strategy Configuration
    strategyName: process.env.STRATEGY_NAME || 'demo_strategy',
    demoBalance: parseFloat(process.env.DEMO_BALANCE || '1000'),
    tradeSize: parseFloat(process.env.TRADE_SIZE || '10'),
    priceTarget: parseFloat(process.env.PRICE_TARGET || '0.50'),
    
    // Realism Settings
    enableRealisticSlippage: (process.env.ENABLE_REALISTIC_SLIPPAGE || 'false').toLowerCase() === 'true',

    // Application Settings
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    nodeEnv: (process.env.NODE_ENV as any) || 'development',

    // Optional API credentials
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
    apiPassphrase: process.env.API_PASSPHRASE,
  };
}
