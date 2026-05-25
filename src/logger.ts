import { PolymarketConfig } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LogLevelPriority = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LogLevelPriority[level] >= LogLevelPriority[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] ${levelStr} ${message}${dataStr}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error ? error.message : error;
      console.error(this.formatMessage('error', message, errorData));
    }
  }
}

export function createLogger(config: PolymarketConfig): Logger {
  return new Logger(config.logLevel);
}
