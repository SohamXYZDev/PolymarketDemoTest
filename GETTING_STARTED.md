# Getting Started with Polymarket Demo Test

This guide walks you through setting up and running the Polymarket trading strategy demo.

## Prerequisites

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **An Ethereum wallet** with funds on Polygon network
- **pUSD balance** (Polymarket's collateral token) - needed for trading
- **POL balance** (Polygon native token) - needed for gas fees (if using EOA)

## Step 1: Get Your Wallet Ready

### Option A: Create a New Wallet

1. Use MetaMask or any Ethereum wallet
2. Switch to **Polygon Network** (Chain ID: 137)
3. Get testnet tokens or bridge real funds

### Option B: Use Existing Wallet

1. Export your private key from MetaMask or your wallet
2. Ensure it has funds on Polygon network

### Get pUSD (For Trading)

1. Visit [Polymarket.com](https://polymarket.com)
2. Use the Bridge feature to deposit collateral
3. Supported assets: USDC, USDT, DAI, WETH

## Step 2: Clone & Install

### Windows

```bash
# Clone the repository
git clone https://github.com/yourusername/PolymarketDemoTest.git
cd PolymarketDemoTest

# Run setup (auto-installs dependencies)
setup.bat
```

### macOS/Linux

```bash
# Clone the repository
git clone https://github.com/yourusername/PolymarketDemoTest.git
cd PolymarketDemoTest

# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

### Manual Install

```bash
npm install
cp .env.example .env
```

## Step 3: Configure Environment

### Edit `.env` with your credentials

```bash
# Your private key (NEVER commit this!)
# Get from MetaMask: Settings → Account Details → Export Private Key
PRIVATE_KEY=0x1234567890abcdef... (66 characters total)

# Your wallet address
# Get from MetaMask: Click account name at top
WALLET_ADDRESS=0x1234567890abcdef1234567890abcdef12345678

# Optional: Custom RPC endpoint (defaults to polygon-rpc.com)
RPC_URL=https://polygon-rpc.com

# Strategy settings
DEMO_BALANCE=1000              # Simulated balance for testing
TRADE_SIZE=10                  # Size of test trades
PRICE_TARGET=0.50             # Target price for opportunities
LOG_LEVEL=info                # debug|info|warn|error
```

## Step 4: Verify Setup

### Check Configuration

```bash
npm run type-check
```

### Verify APIs are reachable

```bash
# This will test Gamma API connectivity
npm run dev
```

## Step 5: Run Your First Demo

### Development Mode (Watch Mode)

```bash
npm run dev
```

This will:
1. ✅ Load configuration from `.env`
2. ✅ Connect to Polymarket APIs
3. ✅ Authenticate with your wallet (L1 auth)
4. ✅ Fetch active markets
5. ✅ Analyze trading opportunities
6. ✅ Simulate a trade
7. ❓ Ask if you want to execute with real funds

### Interactive Mode

When prompted, you can:
- Press `yes` to execute a real trade (uses pUSD from your wallet)
- Press `no` to simulate only (no funds used)

## Step 6: Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Run production version
npm start
```

Output will be in `dist/` directory.

## Understanding the Demo

### What It Does

1. **Fetches Markets**: Gets active prediction markets via Gamma API
2. **Analyzes Spreads**: Calculates bid-ask spread for each market
3. **Finds Opportunities**: Identifies markets with tight spreads
4. **Simulates Trades**: Shows what would happen if you traded
5. **Asks for Confirmation**: Before trading with real money

### Example Output

```
INFO Polymarket Demo Test Starting
INFO Initializing APIs...
INFO Setting up CLOB client with L1 authentication...
INFO Running market analysis...
INFO Found 5 trading opportunities
INFO Simulating top trade opportunity...
INFO Simulation Result:
  recommendation: BUY 10 at 0.51 - Good spread (1.5%) and price below target

Portfolio Summary:
  balance: 1000
  positions: 0
  unrealizedPnL: 0
  totalValue: 1000

⚠️  REAL TRADE: Execute this trade with ACTUAL FUNDS? (yes/no):
```

## Troubleshooting

### "Missing required environment variables"

```bash
# Make sure .env is filled out completely
# PRIVATE_KEY=0x... (must start with 0x and be 66 chars)
# WALLET_ADDRESS=0x... (must be 42 chars)

cat .env
```

### "CLOB API health check failed"

This is normal during initialization. The client will authenticate on first use.

### "INVALID_SIGNATURE"

```bash
# Verify your private key:
# - Must start with 0x
# - Must be 66 characters total (0x + 64 hex chars)
# - Must match your wallet address

# Export fresh private key from MetaMask:
# Settings → Account Details → Export Private Key
```

### "Insufficient funds"

Your wallet needs:
- **pUSD**: For buying outcome tokens (get via Bridge)
- **POL**: For gas fees (get from faucet or exchange)

```bash
# Check your balance:
# 1. Go to MetaMask
# 2. Switch to Polygon network
# 3. View your account balance
```

### Transaction hangs or errors

```bash
# Increase timeout in axios (src/api/gammaApi.ts)
# Or use different RPC endpoint in .env
RPC_URL=https://polygon.blockpi.network/v1/rpc/public
```

## Next Steps

### Try Different Strategies

Edit `src/strategy/strategyEngine.ts` to:
- Change spread threshold
- Add volume requirements
- Filter by market tags
- Implement custom scoring

### Use the Examples

```bash
# Quick start example
npx ts-node examples/quickStart.ts

# Advanced strategy example
npx ts-node examples/advancedStrategy.ts
```

### Real Trading

Once comfortable with simulations:

1. Keep production amount small
2. Monitor trades closely
3. Test different market conditions
4. Build custom strategies

## Security Best Practices

⚠️ **IMPORTANT**:

- ✅ Never commit `.env` to Git
- ✅ Never share your private key
- ✅ Never paste private key in browser
- ✅ Use .gitignore to exclude `.env`
- ✅ Rotate keys periodically
- ✅ Test on small amounts first

## API Rate Limits

- **Gamma API**: No rate limits (public)
- **CLOB API**: ~1000 requests/min per user
- **WebSocket**: Real-time updates, connection limits

## Support

- **Documentation**: https://docs.polymarket.com
- **Discord**: https://discord.gg/polymarket
- **Issues**: Create GitHub issue with logs

## Advanced Usage

### Environment Variables Reference

```bash
# Required
PRIVATE_KEY=0x...                 # Your Ethereum private key
WALLET_ADDRESS=0x...             # Your wallet address

# Optional but recommended
RPC_URL=https://polygon-rpc.com   # Polygon RPC endpoint
LOG_LEVEL=info                    # Logging level

# Optional API endpoints (defaults work fine)
GAMMA_API_BASE_URL=https://gamma-api.polymarket.com
CLOB_API_BASE_URL=https://clob.polymarket.com
DATA_API_BASE_URL=https://data-api.polymarket.com

# Strategy parameters
STRATEGY_NAME=demo_strategy
DEMO_BALANCE=1000                 # Simulated balance
TRADE_SIZE=10                     # Size per trade
PRICE_TARGET=0.50                 # Target price threshold
```

### Running Tests

```bash
npm test
npm run type-check
npm run lint
```

### Building for Production

```bash
npm run build
npm start

# Or with environment override
NODE_ENV=production npm start
```

## FAQ

**Q: Do I need real pUSD to run the demo?**  
A: No! Use simulation mode (just press `no` at the prompt). Real funds only used if you explicitly confirm.

**Q: Can I test without a wallet?**  
A: No, you need a wallet for authentication. But you don't need funds to test - just use simulation mode.

**Q: How do I get pUSD?**  
A: Use Polymarket's Bridge (on their website) to deposit USDC, USDT, or DAI.

**Q: Can I use a hardware wallet?**  
A: Yes, but you'll need to export the private key temporarily (not recommended for large funds).

**Q: What markets can I trade?**  
A: Any active market on Polymarket. Most markets are binary (Yes/No) predictions.

**Q: How do fees work?**  
A: Typically ~2% base fee. See [Polymarket Fees](https://docs.polymarket.com/trading/fees).

## License

MIT - See LICENSE file

---

**Happy trading!** 🚀  
Remember: Start with small amounts and always test in simulation first.
