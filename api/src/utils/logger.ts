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

export class Logger {
    private minLevel: LogLevel;
    private context?: string;
    private static supabaseClient: any = null;
    private static currentUserId: string | null = null;

    constructor(context?: string) {
        this.minLevel = config.isProduction ? 'info' : 'debug';
        this.context = context;
    }

    /**
     * Set the Supabase client and current user ID for DB persistence.
     * This is called by the auth middleware or server initialization.
     */
    static setPersistence(client: any, userId: string | null = null): void {
        Logger.supabaseClient = client;
        Logger.currentUserId = userId;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
    }

    private async saveToSupabase(level: LogLevel, message: string, meta?: LogMeta): Promise<void> {
        // Only persist warn and error levels to DB to prevent bloat
        // unless explicitly forced via meta
        const persistLevels: LogLevel[] = ['warn', 'error'];
        const shouldPersist = persistLevels.includes(level) || meta?._persist === true;

        if (shouldPersist && Logger.supabaseClient) {
            try {
                // Remove internal flags from meta before saving
                const { _persist, ...cleanMeta } = meta || {};
                
                await Logger.supabaseClient.from('system_logs').insert({
                    user_id: Logger.currentUserId,
                    level,
                    source: this.context || 'System',
                    message,
                    metadata: cleanMeta,
                    created_at: new Date().toISOString()
                });
            } catch (err) {
                // Fail silently to avoid infinite loops if logging fails
                console.error('[Logger] Failed to persist log to Supabase:', err);
            }
        }
    }

    private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
        const timestamp = new Date().toISOString();
        const contextStr = this.context ? `[${this.context}]` : '';
        const { _persist, ...cleanMeta } = meta || {};
        const metaStr = Object.keys(cleanMeta).length > 0 ? ` ${JSON.stringify(cleanMeta)}` : '';
        
        if (config.isProduction) {
            return JSON.stringify({
                timestamp,
                level,
                context: this.context,
                message,
                ...cleanMeta,
            });
        }
        
        const color = LOG_COLORS[level];
        const reset = LOG_COLORS.reset;
        return `${timestamp} ${color}${level.toUpperCase().padEnd(5)}${reset} ${contextStr} ${message}${metaStr}`;
    }

    debug(message: string, meta?: LogMeta): void {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, meta));
            this.saveToSupabase('debug', message, meta);
        }
    }

    info(message: string, meta?: LogMeta): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, meta));
            this.saveToSupabase('info', message, meta);
        }
    }

    warn(message: string, meta?: LogMeta): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
            this.saveToSupabase('warn', message, meta);
        }
    }

    error(message: string, error?: Error | unknown, meta?: LogMeta): void {
        if (this.shouldLog('error')) {
            const errorMeta: LogMeta = { ...meta };
            if (error instanceof Error) {
                errorMeta.errorName = error.name;
                errorMeta.errorMessage = error.message;
                errorMeta.stack = error.stack;
            } else if (error) {
                errorMeta.error = error;
            }
            console.error(this.formatMessage('error', message, errorMeta));
            this.saveToSupabase('error', message, errorMeta);
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
