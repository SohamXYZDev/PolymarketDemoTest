# Polymarket Demo Test

Test your strategies on the live Polymarket market with demo balance! Highly customizable.

## Features

- ✅ **Live Market Data**: Real-time market fetching via Gamma API
- ✅ **Market Analysis**: Intelligent spread analysis for trading opportunities
- ✅ **Trading Simulation**: Dry-run trades before executing with real funds
- ✅ **CLOB API Integration**: Authenticated trading with L1/L2 authentication
- ✅ **Production-Ready**: Proper env configuration, logging, error handling
- ✅ **TypeScript**: Full type safety and IDE support
- ✅ **Modular Design**: Separate concerns for APIs, strategy, and config

## Architecture

```
src/
├── index.ts                 # Entry point
├── config.ts               # Environment configuration & validation
├── logger.ts               # Structured logging
├── api/
│   ├── gammaApi.ts         # Gamma API (public market data)
│   └── clobApi.ts          # CLOB API (trading & authentication)
└── strategy/
    └── strategyEngine.ts   # Trading strategy & analysis
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Ethereum wallet with Polygon (MATIC) network access
- pUSD balance (Polymarket's collateral token)
- POL balance for gas (if using EOA wallet type)

### Installation

```bash
# Clone and install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# PRIVATE_KEY=0x... (your Ethereum private key)
# WALLET_ADDRESS=0x... (your Polygon wallet address)
```

### Configuration

Edit `.env` with your credentials:

```env
PRIVATE_KEY=0x...                    # Your Ethereum private key (66 chars, hex)
WALLET_ADDRESS=0x...                # Your wallet address (42 chars)

# Optional customization
GAMMA_API_BASE_URL=https://gamma-api.polymarket.com
CLOB_API_BASE_URL=https://clob.polymarket.com
STRATEGY_NAME=demo_strategy
DEMO_BALANCE=1000
TRADE_SIZE=10
PRICE_TARGET=0.50
LOG_LEVEL=info
```

### Running

```bash
# Development (watch mode with tsx)
npm run dev

# Build
npm run build

# Production
npm start

# Type checking
npm run type-check
```

## API Reference

### Gamma API (Public)

Used for fetching market data without authentication.

```typescript
const gammaApi = new GammaApi(baseUrl, logger);

// Get active markets
const markets = await gammaApi.getMarkets({
  active: true,
  closed: false,
  limit: 20
});

// Search markets
const results = await gammaApi.searchMarkets('Will Trump win?');

// Get single market
const market = await gammaApi.getMarketById(marketId);
```

### CLOB API (Authenticated)

Used for trading operations. Requires L1 (private key) and L2 (API credentials) authentication.

```typescript
const clobApi = new ClobApiClient(config, logger);

// Initialize (handles L1→L2 auth automatically)
await clobApi.initialize();

// Place order
const order = await clobApi.placeOrder({
  tokenID: 'token-id-123',
  price: 0.50,
  size: 10,
  side: 'BUY',
  tickSize: '0.01',
  negRisk: false
});

// Get user orders
const orders = await clobApi.getUserOrders();

// Cancel order
await clobApi.cancelOrder(orderId);
```

### Strategy Engine

Market analysis and simulated trading.

```typescript
const strategy = new StrategyEngine(gammaApi, clobApi, config, logger);

// Find opportunities
const signals = await strategy.findOpportunities();

// Simulate trade (dry-run)
const simulation = await strategy.simulateTrade(signal);

// Execute trade (USES REAL FUNDS)
const result = await strategy.executeTrade(signal);

// Get portfolio summary
const portfolio = strategy.getPortfolioSummary();
```

## Authentication

### Two-Level Auth (L1 → L2)

1. **L1 Authentication**: Uses your private key to sign an EIP-712 message
   - Proves ownership of wallet
   - Private key stays with you (non-custodial)

2. **L2 Authentication**: Uses generated API credentials
   - apiKey, secret, passphrase
   - Used for subsequent API requests
   - Can be stored in `.env` for reuse

```typescript
// First time: creates credentials
const credentials = await client.createOrDeriveApiKey();
// {
//   key: '550e8400-...',
//   secret: 'base64EncodedSecret',
//   passphrase: 'randomPassphrase'
// }

// Save to .env for future runs
// API_KEY=550e8400-...
// API_SECRET=base64EncodedSecret
// API_PASSPHRASE=randomPassphrase
```

## Strategy Example

The included strategy:

1. **Fetches** 20 active markets from Gamma API
2. **Analyzes** bid-ask spreads
3. **Generates signals** for markets with spreads < 2% and price below target
4. **Simulates** the trade (dry-run)
5. **Prompts** for confirmation before executing with real funds
6. **Executes** order if user confirms

## Production Best Practices Implemented

✅ **Environment Variables**: All secrets in `.env` (never committed)  
✅ **Structured Logging**: Timestamped, level-based logging  
✅ **Error Handling**: Try-catch with meaningful error messages  
✅ **Type Safety**: Full TypeScript with strict mode  
✅ **Input Validation**: Config validation on startup  
✅ **Security**: Private keys never logged or exposed  
✅ **Modularity**: Separated concerns (API, strategy, config)  
✅ **Health Checks**: API health verification  
✅ **Rate Limiting**: Respects API limits with appropriate timeouts  

## Trading Safety

### Simulation Mode

- ✅ Practice with zero risk
- ✅ Test strategies before real execution
- ✅ Verify market conditions

### Real Trading

⚠️ **WARNING**: Real trading uses actual funds!

- ✅ User confirmation required before any trade
- ✅ Wallet must have pUSD balance
- ✅ EOA wallets need POL for gas
- ✅ All orders are signed by your private key

## Polymarket Concepts

### Prediction Markets

- **Binary markets**: Yes/No outcomes (e.g., "Will Trump win 2024?")
- **Multi-outcome**: Multiple possible outcomes
- **Tokens**: Outcome tokens (YES/NO) represent positions
- **Trading**: Buy/sell outcome tokens to profit from predictions

### Collateral

- **pUSD**: Polymarket's collateral token (stablecoin)
- **Required**: To buy outcome tokens
- **Redemption**: After market resolution, redeem winning tokens for pUSD

### Fees

- **Base fee**: Typically ~2% of order value
- **Rewards**: Available for makers and active traders
- **Fee rate**: Varies by market and time

## API Limits

- **Gamma API**: Public endpoints, no auth required
- **CLOB API**: 
  - Public endpoints: No rate limit
  - Authenticated endpoints: Per user/IP limits
  - WebSocket: Real-time order and trade updates

## Troubleshooting

### "Missing required environment variables"

```bash
# Copy the example file
cp .env.example .env

# Edit with your credentials
# PRIVATE_KEY=0x... (your 0x-prefixed hex private key)
# WALLET_ADDRESS=0x... (your Ethereum wallet address)
```

### "CLOB API health check failed"

The CLOB client initializes on first use. This is normal.

### "INVALID_SIGNATURE"

- Verify `PRIVATE_KEY` is valid hex (starts with 0x)
- Check wallet address matches your private key
- Ensure key has 66 characters total (0x + 64 hex chars)

### "Insufficient funds"

- Your wallet needs pUSD to trade
- If using EOA type, also need POL for gas
- Bridge assets using the Bridge API

## Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Lint
npm run lint
```

## Documentation

- [Polymarket API Docs](https://docs.polymarket.com)
- [Gamma API Reference](https://docs.polymarket.com/api-reference/introduction)
- [CLOB API Authentication](https://docs.polymarket.com/api-reference/authentication)
- [Trading Quickstart](https://docs.polymarket.com/quickstart)
- [Concepts & Definitions](https://docs.polymarket.com/concepts/markets-events)

## SDK Versions

- `@polymarket/clob-client-v2`: Latest CLOB client
- `viem`: Ethereum interaction library
- `axios`: HTTP client for Gamma/Data APIs

## Contributing

Feel free to modify the strategy engine to test your own algorithms!

## Disclaimer

⚠️ **This is a demo application**. Trading crypto prediction markets involves real financial risk.

- Always test with simulation first
- Start with small amounts
- Understand the markets before trading
- Never share your private key with anyone

## License

MIT
