import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';
import { createLogger, Logger } from '../utils/logger.js';

const logger = createLogger('AuthMiddleware');

import { getServerSupabase, isValidUrl } from '../services/supabase.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
            supabase?: SupabaseClient;
        }
    }
}

// Check if anon key looks valid (JWT or publishable key format)
function isValidAnonKey(key: string): boolean {
    if (!key) return false;
    // JWT anon keys start with eyJ, publishable keys start with sb_publishable_
    return key.startsWith('eyJ') || key.startsWith('sb_publishable_');
}

// Helper to get Supabase config from request headers (frontend passes these)
function getSupabaseConfigFromRequest(req: Request): { url: string; anonKey: string } | null {
    const url = req.headers['x-supabase-url'] as string;
    const anonKey = req.headers['x-supabase-anon-key'] as string;

    if (url && anonKey && isValidUrl(url) && isValidAnonKey(anonKey)) {
        return { url, anonKey };
    }
    return null;
}

export async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Get Supabase config: prefer env vars, fallback to request headers
        const headerConfig = getSupabaseConfigFromRequest(req);
        
        const envUrl = config.supabase.url;
        const envKey = config.supabase.anonKey;

        // Basic validation: URL must start with http(s)
        // This prevents using placeholders like "CHANGE_ME" or empty strings
        const isEnvUrlValid = envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'));
        const isEnvKeyValid = !!envKey && envKey.length > 0;
        
        const supabaseUrl = isEnvUrlValid ? envUrl : (headerConfig?.url || '');
        const supabaseAnonKey = isEnvKeyValid ? envKey : (headerConfig?.anonKey || '');

        // Development bypass: skip auth if DISABLE_AUTH=true in non-production
        if (config.security.disableAuth && !config.isProduction) {
            logger.warn('Auth disabled for development - creating mock user');

            // Create a mock user for development
            req.user = {
                id: '00000000-0000-0000-0000-000000000000',
                email: 'dev@local.test',
                user_metadata: {},
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
            } as User;

            // Use the shared Supabase client, or create one from request headers
            let supabase = getServerSupabase();
            if (!supabase && supabaseUrl && supabaseAnonKey) {
                supabase = createClient(supabaseUrl, supabaseAnonKey, {
                    auth: { autoRefreshToken: false, persistSession: false },
                });
            }

            if (supabase) {
                req.supabase = supabase;
                // Initialize logger persistence for mock user
                Logger.setPersistence(supabase, req.user.id);
            } else {
                throw new AuthenticationError('Supabase not configured. Please set up Supabase in the app or provide SUPABASE_URL/ANON_KEY in .env');
            }

            return next();
        }

        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new AuthenticationError('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new AuthenticationError('Supabase not configured. Please set up Supabase in the app or provide SUPABASE_URL/ANON_KEY in .env');
        }

        // Create a Supabase client with the user's token
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        // Verify the token by getting the user
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            logger.debug('Auth failed', { error: error?.message });
            throw new AuthenticationError('Invalid or expired token');
        }

        // Initialize logger persistence for this request
        Logger.setPersistence(supabase, user.id);

        // Attach user and supabase client to request
        req.user = user;
        req.supabase = supabase;

        next();
    } catch (error) {
        logger.error('Auth middleware error', error);
        next(error);
    }
}

export function optionalAuth(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        // No auth provided, continue without user
        return next();
    }

    // If auth is provided, validate it
    authMiddleware(req, _res, next);
}

export function requireRole(roles: string[]) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AuthenticationError());
        }

        // Check user metadata for role (customize based on your auth setup)
        const userRole = req.user.user_metadata?.role || 'user';

        if (!roles.includes(userRole)) {
            return next(new AuthorizationError(`Requires one of: ${roles.join(', ')}`));
        }

        next();
    };
}
