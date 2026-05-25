import { ClobClient, Side, OrderType } from '@polymarket/clob-client-v2';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Logger } from '../logger';
import { PolymarketConfig } from '../config';

export interface ApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface OrderResponse {
  orderID: string;
  status: string;
  timestamp: number;
}

export interface Market {
  condition_id: string;
  minimum_tick_size: string;
  neg_risk: boolean;
  tokens: string[];
}

export class ClobApiClient {
  private client: ClobClient | null = null;
  private logger: Logger;
  private config: PolymarketConfig;

  constructor(config: PolymarketConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the CLOB client with L1 authentication
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing CLOB client');

      const account = privateKeyToAccount(this.config.privateKey as `0x${string}`);
      const signer = createWalletClient({
        account,
        transport: http(this.config.rpcUrl),
      });

      // Create initial client for L1 authentication
      const tempClient = new ClobClient({
        host: this.config.clobApiBaseUrl,
        chain: this.config.chainId,
        signer,
      });

      // Get or create API credentials (L2 auth)
      let credentials: ApiCredentials;
      if (this.config.apiKey && this.config.apiSecret && this.config.apiPassphrase) {
        this.logger.info('Using stored API credentials');
        credentials = {
          key: this.config.apiKey,
          secret: this.config.apiSecret,
          passphrase: this.config.apiPassphrase,
        };
      } else {
        this.logger.info('Creating new API credentials (L1 to L2 auth)');
        credentials = (await tempClient.createOrDeriveApiKey()) as ApiCredentials;
        this.logger.info('API credentials created successfully', {
          key: credentials.key.substring(0, 8) + '...',
        });
      }

      // Initialize the authenticated client
      this.client = new ClobClient({
        host: this.config.clobApiBaseUrl,
        chain: this.config.chainId,
        signer,
        creds: credentials,
        signatureType: 0, // EOA
        funderAddress: this.config.walletAddress as `0x${string}`,
      });

      this.logger.info('CLOB client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CLOB client', error);
      throw new Error(
        `Failed to initialize CLOB client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get market details
   */
  async getMarket(conditionId: string): Promise<Market> {
    if (!this.client) {
      throw new Error('CLOB client not initialized');
    }

    try {
      this.logger.debug('Fetching market details', { conditionId });
      const market = (await this.client.getMarket(conditionId)) as Market;
      return market;
    } catch (error) {
      this.logger.error('Failed to fetch market', { conditionId, error });
      throw new Error(
        `Failed to fetch market: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Place a limit order
   */
  async placeOrder(params: {
    tokenID: string;
    price: number;
    size: number;
    side: 'BUY' | 'SELL';
    tickSize: string;
    negRisk: boolean;
  }): Promise<OrderResponse> {
    if (!this.client) {
      throw new Error('CLOB client not initialized');
    }

    try {
      this.logger.info('Placing order', {
        tokenID: params.tokenID.substring(0, 8) + '...',
        price: params.price,
        size: params.size,
        side: params.side,
      });

      const response = (await this.client.createAndPostOrder(
        {
          tokenID: params.tokenID,
          price: params.price,
          size: params.size,
          side: params.side === 'BUY' ? Side.BUY : Side.SELL,
        },
        {
          tickSize: params.tickSize,
          negRisk: params.negRisk,
        }
      )) as OrderResponse;

      this.logger.info('Order placed successfully', {
        orderID: response.orderID,
        status: response.status,
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to place order', error);
      throw new Error(
        `Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(): Promise<any[]> {
    if (!this.client) {
      throw new Error('CLOB client not initialized');
    }

    try {
      this.logger.debug('Fetching user orders');
      const orders = await this.client.getUserOrders();
      this.logger.debug('User orders fetched', { count: orders.length });
      return orders;
    } catch (error) {
      this.logger.error('Failed to fetch user orders', error);
      throw new Error(
        `Failed to fetch user orders: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    if (!this.client) {
      throw new Error('CLOB client not initialized');
    }

    try {
      this.logger.info('Canceling order', { orderId });
      await this.client.cancelOrder(orderId);
      this.logger.info('Order cancelled successfully', { orderId });
    } catch (error) {
      this.logger.error('Failed to cancel order', { orderId, error });
      throw new Error(
        `Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get order book for a token
   */
  async getOrderBook(tokenId: string): Promise<any> {
    if (!this.client) {
      throw new Error('CLOB client not initialized');
    }

    try {
      this.logger.debug('Fetching order book', { tokenId });
      const orderBook = await this.client.getOrderBook(tokenId);
      return orderBook;
    } catch (error) {
      this.logger.error('Failed to fetch order book', { tokenId, error });
      throw new Error(
        `Failed to fetch order book: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Health check for CLOB API
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.getServerTime();
      return true;
    } catch (error) {
      this.logger.warn('CLOB API health check failed', error);
      return false;
    }
  }
}
