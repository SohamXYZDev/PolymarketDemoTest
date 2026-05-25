import axios, { AxiosInstance } from 'axios';
import { Logger } from '../logger';

export interface Market {
  id: string;
  question: string;
  description: string;
  clobTokenIds: string[];
  condition_id: string;
  outcomes: string[];
  pricing: {
    bid: number;
    ask: number;
    last: number;
  };
  volume: number;
  createdAt: string;
  resolutionDate: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  endDate: string;
  markets: string[]; // Market IDs
}

export class GammaApi {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(baseUrl: string, logger: Logger) {
    this.logger = logger;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch active markets
   */
  async getMarkets(options?: {
    active?: boolean;
    closed?: boolean;
    limit?: number;
    offset?: number;
    tag?: string;
  }): Promise<Market[]> {
    try {
      this.logger.debug('Fetching markets', { options });

      const response = await this.client.get('/markets', {
        params: {
          active: options?.active ?? true,
          closed: options?.closed ?? false,
          limit: options?.limit ?? 10,
          offset: options?.offset ?? 0,
          ...(options?.tag && { tag: options.tag }),
        },
      });

      this.logger.debug('Markets fetched successfully', { count: response.data.length });
      return response.data as Market[];
    } catch (error) {
      this.logger.error('Failed to fetch markets', error);
      throw new Error(`Failed to fetch markets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch a single market by ID
   */
  async getMarketById(marketId: string): Promise<Market> {
    try {
      this.logger.debug('Fetching market by ID', { marketId });

      const response = await this.client.get(`/markets/${marketId}`);

      this.logger.debug('Market fetched successfully', { marketId });
      return response.data as Market;
    } catch (error) {
      this.logger.error('Failed to fetch market', { marketId, error });
      throw new Error(
        `Failed to fetch market ${marketId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search markets by slug or keyword
   */
  async searchMarkets(query: string): Promise<Market[]> {
    try {
      this.logger.debug('Searching markets', { query });

      const response = await this.client.get('/markets', {
        params: {
          search: query,
          active: true,
          limit: 20,
        },
      });

      this.logger.debug('Markets search completed', { count: response.data.length });
      return response.data as Market[];
    } catch (error) {
      this.logger.error('Failed to search markets', { query, error });
      throw new Error(
        `Failed to search markets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get events
   */
  async getEvents(options?: { limit?: number; offset?: number }): Promise<Event[]> {
    try {
      this.logger.debug('Fetching events', { options });

      const response = await this.client.get('/events', {
        params: {
          limit: options?.limit ?? 10,
          offset: options?.offset ?? 0,
        },
      });

      this.logger.debug('Events fetched successfully', { count: response.data.length });
      return response.data as Event[];
    } catch (error) {
      this.logger.error('Failed to fetch events', error);
      throw new Error(`Failed to fetch events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for Gamma API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/markets', { params: { limit: 1 } });
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Gamma API health check failed', error);
      return false;
    }
  }
}
