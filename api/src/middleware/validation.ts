import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errorHandler.js';

export function validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                next(new ValidationError(messages));
            } else {
                next(error);
            }
        }
    };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query) as any;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                next(new ValidationError(messages));
            } else {
                next(error);
            }
        }
    };
}

export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.params = schema.parse(req.params) as any;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                next(new ValidationError(messages));
            } else {
                next(error);
            }
        }
    };
}

// Common validation schemas
export const schemas = {
    uuid: z.string().uuid(),
    email: z.string().email(),

    // Auth schemas
    gmailCallback: z.object({
        code: z.string().min(1, 'Authorization code is required'),
    }),

    deviceFlow: z.object({
        device_code: z.string().min(1, 'Device code is required'),
    }),

    // Sync schemas
    syncRequest: z.object({
        accountId: z.string().uuid('Invalid account ID'),
    }),

    // Action schemas
    executeAction: z.object({
        emailId: z.string().uuid('Invalid email ID'),
        action: z.enum(['delete', 'archive', 'draft', 'flag', 'none']),
        draftContent: z.string().optional(),
    }),

    // Migration schemas
    migrate: z.object({
        projectRef: z.string().min(1, 'Project reference is required'),
        dbPassword: z.string().optional(),
        accessToken: z.string().optional(),
    }),

    // Rule schemas
    createRule: z.object({
        name: z.string().min(1).max(100),
        condition: z.record(z.unknown()),
        action: z.enum(['delete', 'archive', 'draft']),
        is_enabled: z.boolean().default(true),
    }),

    updateRule: z.object({
        name: z.string().min(1).max(100).optional(),
        condition: z.record(z.unknown()).optional(),
        action: z.enum(['delete', 'archive', 'draft']).optional(),
        is_enabled: z.boolean().optional(),
    }),

    // Settings schemas
    updateSettings: z.object({
        llm_model: z.string().optional(),
        llm_base_url: z.string().url().optional().or(z.literal('')),
        llm_api_key: z.string().optional(),
        auto_trash_spam: z.boolean().optional(),
        smart_drafts: z.boolean().optional(),
        sync_interval_minutes: z.number().min(1).max(60).optional(),
        // BYOK Credentials (transient, moved to integrations)
        google_client_id: z.string().optional(),
        google_client_secret: z.string().optional(),
        microsoft_client_id: z.string().optional(),
        microsoft_client_secret: z.string().optional(),
        microsoft_tenant_id: z.string().optional(),
    }),
};
