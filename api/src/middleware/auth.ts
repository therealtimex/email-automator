import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AuthMiddleware');

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
            supabase?: SupabaseClient;
        }
    }
}

export async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Development bypass: skip auth if DISABLE_AUTH=true in non-production
        if (config.security.disableAuth && !config.isProduction) {
            logger.warn('Auth disabled for development - creating mock user');

            // Create a mock user for development
            req.user = {
                id: 'dev-user-id',
                email: 'dev@local.test',
                user_metadata: {},
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
            } as User;

            // Create a regular Supabase client for development
            if (config.supabase.url && config.supabase.anonKey) {
                req.supabase = createClient(config.supabase.url, config.supabase.anonKey);
            }

            return next();
        }

        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new AuthenticationError('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);

        if (!config.supabase.url || !config.supabase.anonKey) {
            throw new AuthenticationError('Supabase not configured');
        }

        // Create a Supabase client with the user's token
        const supabase = createClient(config.supabase.url, config.supabase.anonKey, {
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

        // Attach user and supabase client to request
        req.user = user;
        req.supabase = supabase;

        next();
    } catch (error) {
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
