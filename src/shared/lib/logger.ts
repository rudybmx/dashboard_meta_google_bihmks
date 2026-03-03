/**
 * Logger utility that only logs in development mode
 * Automatically strips logs in production builds
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

/**
 * Safely converts any value to a string representation
 * Prevents "Cannot convert object to primitive value" errors
 */
const safeStringify = (arg: unknown): string => {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  
  try {
    // Try to stringify objects
    return JSON.stringify(arg, (key, value) => {
      if (value === undefined) return 'undefined';
      if (typeof value === 'function') return '[Function]';
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      return value;
    }, 2);
  } catch {
    return '[Object with circular reference or non-serializable]';
  }
};

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (!isDev) return false;
    
    // In development, respect log level
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'debug';
    return levels.indexOf(level) >= levels.indexOf(minLevel);
  }

  private formatArgs(args: unknown[]): unknown[] {
    return args.map(arg => {
      // If it's a simple primitive, return as-is
      if (arg === null || arg === undefined || typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return arg;
      }
      // For objects, ensure they can be logged safely
      if (typeof arg === 'object') {
        try {
          // Test if object can be converted to primitive
          String(arg);
          return arg;
        } catch {
          return safeStringify(arg);
        }
      }
      return arg;
    });
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...this.formatArgs(args));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...this.formatArgs(args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...this.formatArgs(args));
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...this.formatArgs(args));
    }
  }
}

export const logger = new Logger();
export default logger;
