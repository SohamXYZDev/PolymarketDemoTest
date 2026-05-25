# Polymarket Demo Test - Architecture & Implementation Guide

## Project Overview

A **production-ready** Polymarket trading strategy tester that:

- Fetches live market data from Polymarket APIs
- Analyzes trading opportunities (bid-ask spreads, pricing)
- Simulates trades before execution
- Executes real trades with user confirmation
- Implements L1/L2 authentication automatically
- Uses environment variables for security

## API Integration

### Gamma API (Public, No Auth)

**Purpose**: Fetch market data, events, tags, search capabilities

**Endpoints Used**:
- `GET /markets` - List active markets with filtering
- `GET /markets/{id}` - Get single market details
- `GET /events` - List events
- Search functionality

**Example**:
```bash
GET https://gamma-api.polymarket.com/markets?active=true&limit=20
```

### CLOB API (Authenticated Trading)

**Purpose**: Place orders, manage positions, access orderbook

**Authentication Flow**:
1. **L1 Auth**: Sign EIP-712 message with private key
2. **L2 Auth**: Get API credentials (key, secret, passphrase)
3. **Trade**: Use L2 credentials for order operations

**Endpoints Used**:
- `POST /auth/api-key` - Create/derive credentials (L1 auth)
- `POST /order` - Place limit order
- `GET /orders` - Get user orders
- `DELETE /order/{id}` - Cancel order
- `GET /orderbook/{tokenId}` - Get market orderbook

**Example**:
```bash
# L1: Create credentials
POST https://clob.polymarket.com/auth/api-key
Header: POLY_SIGNATURE, POLY_TIMESTAMP, POLY_ADDRESS, POLY_NONCE

# L2: Place order (using generated credentials)
POST https://clob.polymarket.com/order
Headers: POLY_API_KEY, POLY_SIGNATURE, POLY_TIMESTAMP, POLY_ADDRESS, POLY_PASSPHRASE
```

## Authentication Architecture

### Two-Level Authentication (L1 → L2)

```
┌─────────────────────────────────────────────────┐
│          User Wallet (Private Key)              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │  L1 Authentication      │
        │  EIP-712 Message        │
        │  Signature with PK      │
        └──────────┬──────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │  Create API Credentials              │
    │  - apiKey                            │
    │  - secret                            │
    │  - passphrase                        │
    └──────────┬───────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │  L2 Authentication (Subsequent Calls)│
    │  HMAC-SHA256 with secret             │
    │  All orders still signed by PK       │
    └──────────────────────────────────────┘
```

**Security Properties**:
- Private key never shared with API
- All operations remain non-custodial
- Credentials can be rotated
- Each user isolated to their address

## Module Architecture

```
src/
├── index.ts
│   └── Main entry point
│       ├── Loads config
│       ├── Initializes APIs
│       ├── Runs strategy
│       └── Handles user interaction
│
├── config.ts
│   └── Configuration management
│       ├── Loads .env
│       ├── Validates inputs
│       ├── Provides typed config
│       └── Manages API endpoints
│
├── logger.ts
│   └── Structured logging
│       ├── Timestamped output
│       ├── Level-based filtering
│       ├── Debug/info/warn/error
│       └── JSON serialization
│
├── api/
│   ├── gammaApi.ts
│   │   └── Market data fetching
│   │       ├── Get markets
│   │       ├── Search markets
│   │       ├── Get events
│   │       └── Health checks
│   │
│   └── clobApi.ts
│       └── Trading operations
│           ├── L1 authentication setup
│           ├── API credential generation
│           ├── Place orders
│           ├── Cancel orders
│           ├── Get order book
│           └── Health checks
│
└── strategy/
    └── strategyEngine.ts
        └── Trading logic
            ├── Market analysis
            ├── Opportunity finding
            ├── Trade simulation
            ├── Trade execution
            └── Portfolio tracking
```

## Data Flow Diagram

```
┌──────────────┐
│ Start Demo   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Load Config (.env)   │
│ Validate inputs      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────┐
│ Initialize APIs          │
├──────────────────────────┤
│ Gamma API (public)       │
│ CLOB API (auth + config) │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ L1 Authentication        │
│ Sign EIP-712 message     │
│ with private key         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Generate/Retrieve        │
│ L2 API Credentials       │
│ (key, secret, pass)      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Fetch Markets            │
│ Gamma API → 20 markets   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Analyze Markets          │
│ • Calculate spreads      │
│ • Score opportunities    │
│ • Find signals           │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Simulate Top Trade       │
│ • Dry-run order          │
│ • Show recommendation    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ User Decision            │
├──────────────────────────┤
│ Execute? (yes/no)        │
└──────┬───────────────────┘
       │
    ┌──┴──┬──────────────┐
    │     │              │
   yes    no            exit
    │     │              │
    │     │              └─────────────┐
    │     └──────────────┐             │
    │                    │             │
    ▼                    ▼             ▼
┌──────────┐         ┌──────────┐  ┌──────────┐
│ Execute  │         │ Simulation   │ Exit    │
│ Real     │         │ Done     │  │ Demo    │
│ Trade    │         └──────────┘  └──────────┘
│ (L2 Auth)│
└──────────┘
```

## Strategy Analysis Algorithm

```typescript
For each market:
  1. Calculate bid-ask spread
     spread% = ((ask - bid) / midpoint) * 100
  
  2. Calculate midpoint
     midpoint = (bid + ask) / 2
  
  3. Score market
     IF spread% < 2% AND midpoint < priceTarget
       score = confidence: 0.7
       GENERATE BUY signal at ask + 0.01
     END IF
  
  4. Sort signals by confidence
  
  5. Present top opportunities
END For
```

## Security Architecture

### Private Key Protection

```
Never exposed to:
- API servers
- Frontend code
- Logs
- Network transmission

Used only for:
- Signing EIP-712 messages (L1 auth)
- Signing orders locally
```

### Credential Management

```
API Credentials (L2):
├── Generated from L1 signature
├── One-time creation per wallet
├── Can be stored in environment
├── Rotated via nonce
└── Different per user
```

### Environment Isolation

```
Production:
└── Credentials in secured secret manager
Development:
└── Credentials in .env (git-ignored)
Testing:
└── Mock credentials or real ones with small amounts
```

## Error Handling Strategy

```
API Errors
├── Network timeouts → Retry with exponential backoff
├── Rate limits → Throttle requests
├── Invalid signature → Validate key format
├── Insufficient balance → Check pUSD amount
└── Market closed → Skip to next opportunity

User Errors
├── Invalid .env → Validate on startup
├── Missing credentials → Prompt for setup
├── Wrong network → Check Polygon mainnet
└── Confirmation timeout → Default to simulation

System Errors
├── API unavailable → Health check warnings
├── Wallet deployment → Deploy first (L1 method)
└── WebSocket disconnect → Reconnect with backoff
```

## Production Checklist

### Before Deploying to Production

- [ ] Environment variables secure (use secret manager)
- [ ] Private key never logged anywhere
- [ ] API credentials rotated periodically
- [ ] Rate limits respected
- [ ] Error handling comprehensive
- [ ] Logging levels appropriate
- [ ] TypeScript strict mode enabled
- [ ] Tests passing
- [ ] Dry-runs validated
- [ ] Small initial amounts tested

### Monitoring in Production

```
Metrics to track:
- API response times
- Error rates by type
- Trade success rate
- PnL per strategy
- Account balance
- Gas costs
- Uptime/availability

Alerts for:
- Failed authentications
- Large account balance changes
- Unusual trade patterns
- API errors > threshold
- Wallet deployment failure
```

## Performance Optimization

### API Caching

```typescript
// Implement in production:
- Cache market data (5 min TTL)
- Cache market details (10 min TTL)
- Cache orderbook snapshots (30 sec TTL)
```

### Connection Pooling

```typescript
// Already handled by:
- axios with keep-alive
- viem connection pooling
- CLOB client connection management
```

### Batch Operations

```typescript
// For multiple markets:
- POST /orders with multiple orders (max 15)
- Get orderbook for multiple tokens
- Fetch market details in bulk
```

## Extending the Strategy

### Add New Signals

```typescript
// In strategyEngine.ts analyzeMarket():
if (spreadPercent < 1.5 && volumeScore > 0.5) {
  // Strong liquidity signal
  return generateSignal(...);
}
```

### Add Risk Management

```typescript
// Position sizing by account size
const positionSize = config.demoBalance * 0.01; // 1% risk

// Stop loss
if (marketPrice < entryPrice * 0.95) {
  cancelOrder();
}

// Take profit
if (marketPrice > entryPrice * 1.05) {
  closePosition();
}
```

### Add Market Filters

```typescript
// Filter by tags
- elections
- sports
- crypto
- weather

// Filter by event timing
- expires in 7 days
- expires in 30 days

// Filter by volume
- minimum volume threshold
```

## Deployment Options

### Local Development
```bash
npm run dev
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Cloud Functions (AWS Lambda, GCP Functions)
```typescript
// Wrap strategy in handler function
export const handler = async (event) => {
  const strategy = new StrategyEngine(...);
  const opportunities = await strategy.findOpportunities();
  return { statusCode: 200, body: opportunities };
};
```

### Scheduled Tasks (Cron)
```bash
# Run every 5 minutes
*/5 * * * * npm start
```

## Cost Analysis

### Per Run Costs
- **Gamma API**: Free (public)
- **CLOB API**: Free (read operations)
- **Trade execution**: ~2% fee on order value
- **Gas (EOA wallets)**: ~0.5 MATIC per trade (~$0.0005)
- **RPC calls**: Free tier available

### Monthly Estimate (100 trades)
- Polymarket fees: ~200 pUSD (2% × average 100 pUSD orders)
- Gas costs: ~0.05 MATIC ($0.00005)
- Total: ~$200 (depends on trading volume)

## References

- [Polymarket API Docs](https://docs.polymarket.com)
- [CLOB Client Repo](https://github.com/Polymarket/clob-client-v2)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [Viem Documentation](https://viem.sh)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
