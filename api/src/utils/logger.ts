import { config } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
    [key: string]: unknown;
}

const LOG_COLORS = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
    reset: '\x1b[0m',
};

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private minLevel: LogLevel;
    private context?: string;

    constructor(context?: string) {
        this.minLevel = config.isProduction ? 'info' : 'debug';
        this.context = context;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
    }

    private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
        const timestamp = new Date().toISOString();
        const contextStr = this.context ? `[${this.context}]` : '';
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        
        if (config.isProduction) {
            // JSON format for production (easier to parse)
            return JSON.stringify({
                timestamp,
                level,
                context: this.context,
                message,
                ...meta,
            });
        }
        
        // Pretty format for development
        const color = LOG_COLORS[level];
        const reset = LOG_COLORS.reset;
        return `${timestamp} ${color}${level.toUpperCase().padEnd(5)}${reset} ${contextStr} ${message}${metaStr}`;
    }

    debug(message: string, meta?: LogMeta): void {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, meta));
        }
    }

    info(message: string, meta?: LogMeta): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, meta));
        }
    }

    warn(message: string, meta?: LogMeta): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }

    error(message: string, error?: Error | unknown, meta?: LogMeta): void {
        if (this.shouldLog('error')) {
            const errorMeta: LogMeta = { ...meta };
            if (error instanceof Error) {
                errorMeta.errorName = error.name;
                errorMeta.errorMessage = error.message;
                if (!config.isProduction) {
                    errorMeta.stack = error.stack;
                }
            } else if (error) {
                errorMeta.error = error;
            }
            console.error(this.formatMessage('error', message, errorMeta));
        }
    }

    child(context: string): Logger {
        return new Logger(this.context ? `${this.context}:${context}` : context);
    }
}

// Default logger instance
export const logger = new Logger();

// Factory for creating contextual loggers
export function createLogger(context: string): Logger {
    return new Logger(context);
}
