import { describe, it, expect } from 'vitest';
import { getConfig } from '../src/config';

describe('Config', () => {
  it('should validate required environment variables', () => {
    // This would fail if .env is not properly configured
    // Run: npm test (when .env is set up)
    expect(() => {
      getConfig();
    }).not.toThrow();
  });

  it('should have valid chain ID for Polygon', () => {
    process.env.PRIVATE_KEY = '0x' + 'a'.repeat(64);
    process.env.WALLET_ADDRESS = '0x' + 'b'.repeat(40);

    const config = getConfig();
    expect(config.chainId).toBe(137);
  });
});
