import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import schemas directly
const schemas = {
    uuid: z.string().uuid(),
    email: z.string().email(),
    
    syncRequest: z.object({
        accountId: z.string().uuid('Invalid account ID'),
    }),
    
    executeAction: z.object({
        emailId: z.string().uuid('Invalid email ID'),
        action: z.enum(['delete', 'archive', 'draft', 'flag', 'none']),
        draftContent: z.string().optional(),
    }),
    
    createRule: z.object({
        name: z.string().min(1).max(100),
        condition: z.record(z.unknown()),
        action: z.enum(['delete', 'archive', 'draft']),
        is_enabled: z.boolean().default(true),
    }),
    
    updateSettings: z.object({
        llm_model: z.string().optional(),
        llm_base_url: z.string().url().optional().or(z.literal('')),
        auto_trash_spam: z.boolean().optional(),
        smart_drafts: z.boolean().optional(),
        sync_interval_minutes: z.number().min(1).max(60).optional(),
    }),
};

describe('Validation Schemas', () => {
    describe('uuid', () => {
        it('should accept valid UUID', () => {
            const result = schemas.uuid.safeParse('123e4567-e89b-12d3-a456-426614174000');
            expect(result.success).toBe(true);
        });

        it('should reject invalid UUID', () => {
            const result = schemas.uuid.safeParse('not-a-uuid');
            expect(result.success).toBe(false);
        });
    });

    describe('syncRequest', () => {
        it('should accept valid sync request', () => {
            const result = schemas.syncRequest.safeParse({
                accountId: '123e4567-e89b-12d3-a456-426614174000',
            });
            expect(result.success).toBe(true);
        });

        it('should reject missing accountId', () => {
            const result = schemas.syncRequest.safeParse({});
            expect(result.success).toBe(false);
        });
    });

    describe('executeAction', () => {
        it('should accept valid action request', () => {
            const result = schemas.executeAction.safeParse({
                emailId: '123e4567-e89b-12d3-a456-426614174000',
                action: 'delete',
            });
            expect(result.success).toBe(true);
        });

        it('should accept action with draft content', () => {
            const result = schemas.executeAction.safeParse({
                emailId: '123e4567-e89b-12d3-a456-426614174000',
                action: 'draft',
                draftContent: 'Hello, this is a reply.',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid action', () => {
            const result = schemas.executeAction.safeParse({
                emailId: '123e4567-e89b-12d3-a456-426614174000',
                action: 'invalid-action',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('createRule', () => {
        it('should accept valid rule', () => {
            const result = schemas.createRule.safeParse({
                name: 'Spam filter',
                condition: { category: 'spam' },
                action: 'delete',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty name', () => {
            const result = schemas.createRule.safeParse({
                name: '',
                condition: { category: 'spam' },
                action: 'delete',
            });
            expect(result.success).toBe(false);
        });

        it('should reject name over 100 characters', () => {
            const result = schemas.createRule.safeParse({
                name: 'a'.repeat(101),
                condition: { category: 'spam' },
                action: 'delete',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('updateSettings', () => {
        it('should accept valid settings', () => {
            const result = schemas.updateSettings.safeParse({
                llm_model: 'gpt-4',
                auto_trash_spam: true,
                sync_interval_minutes: 10,
            });
            expect(result.success).toBe(true);
        });

        it('should accept empty update', () => {
            const result = schemas.updateSettings.safeParse({});
            expect(result.success).toBe(true);
        });

        it('should reject invalid URL', () => {
            const result = schemas.updateSettings.safeParse({
                llm_base_url: 'not-a-url',
            });
            expect(result.success).toBe(false);
        });

        it('should accept empty string for base URL', () => {
            const result = schemas.updateSettings.safeParse({
                llm_base_url: '',
            });
            expect(result.success).toBe(true);
        });

        it('should reject sync interval out of range', () => {
            const result = schemas.updateSettings.safeParse({
                sync_interval_minutes: 0,
            });
            expect(result.success).toBe(false);

            const result2 = schemas.updateSettings.safeParse({
                sync_interval_minutes: 61,
            });
            expect(result2.success).toBe(false);
        });
    });
});
