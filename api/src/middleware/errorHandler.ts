import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';

const logger = createLogger('ErrorHandler');

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class RateLimitError extends AppError {
    constructor() {
        super('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
    }
}

export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Default to 500 if not an AppError
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const isOperational = err instanceof AppError ? err.isOperational : false;
    const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

    // Log error
    if (statusCode >= 500) {
        logger.error('Server error', err, {
            method: req.method,
            path: req.path,
            statusCode,
        });
    } else {
        logger.warn('Client error', {
            method: req.method,
            path: req.path,
            statusCode,
            message: err.message,
        });
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message: isOperational || !config.isProduction 
                ? err.message 
                : 'An unexpected error occurred',
            ...(config.isProduction ? {} : { stack: err.stack }),
        },
    });
}

export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
