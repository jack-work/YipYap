import { DiagLogger } from '@opentelemetry/api';

export function createConsoleLogger(): DiagLogger {
  return {
    verbose: (message: string, ...args: unknown[]): void => {
      console.log(`[VERBOSE] ${message}`, ...args);
    },

    debug: (message: string, ...args: unknown[]): void => {
      console.debug(`[DEBUG] ${message}`, ...args);
    },

    info: (message: string, ...args: unknown[]): void => {
      console.info(`[INFO] ${message}`, ...args);
    },

    warn: (message: string, ...args: unknown[]): void => {
      console.warn(`[WARN] ${message}`, ...args);
    },

    error: (message: string, ...args: unknown[]): void => {
      console.error(`[ERROR] ${message}`, ...args);
    }
  };
}

export class DiagLoggerProvider {
  private static logger: DiagLogger = createConsoleLogger();

  static getConsoleLogger(): DiagLogger {
    return this.logger;
  }
}

