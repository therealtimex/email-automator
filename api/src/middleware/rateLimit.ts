import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errorHandler.js';
import { config } from '../config/index.js';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Cleanup every minute

export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
}

export function rateLimit(options: RateLimitOptions = {}) {
    const {
        windowMs = config.security.rateLimitWindowMs,
        max = config.security.rateLimitMax,
        keyGenerator = (req) => req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
        skip = () => false,
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
        if (skip(req)) {
            return next();
        }

        const key = keyGenerator(req);
        const now = Date.now();
        
        let entry = rateLimitStore.get(key);
        
        if (!entry || entry.resetAt < now) {
            entry = {
                count: 1,
                resetAt: now + windowMs,
            };
            rateLimitStore.set(key, entry);
        } else {
            entry.count++;
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

        if (entry.count > max) {
            return next(new RateLimitError());
        }

        next();
    };
}

// Stricter rate limit for auth endpoints
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
});

// Standard API rate limit
export const apiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
});

// Sync rate limit (expensive operation)
export const syncRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 sync requests per minute
});
