import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the config before importing crypto
vi.mock('../../api/src/config/index.js', () => ({
    config: {
        security: {
            encryptionKey: 'test-encryption-key-32-chars-long',
        },
    },
}));

// Dynamic import to ensure mocks are applied
const { encryptToken, decryptToken, generateSecureToken } = await import('../../api/src/utils/crypto.js');

describe('Crypto Utils', () => {
    describe('encryptToken', () => {
        it('should encrypt a token', () => {
            const plaintext = 'my-secret-token';
            const encrypted = encryptToken(plaintext);
            
            expect(encrypted).not.toBe(plaintext);
            expect(encrypted.split(':').length).toBe(4); // salt:iv:tag:data
        });

        it('should return empty string for empty input', () => {
            expect(encryptToken('')).toBe('');
        });

        it('should produce different ciphertext for same plaintext', () => {
            const plaintext = 'my-secret-token';
            const encrypted1 = encryptToken(plaintext);
            const encrypted2 = encryptToken(plaintext);
            
            expect(encrypted1).not.toBe(encrypted2);
        });
    });

    describe('decryptToken', () => {
        it('should decrypt an encrypted token', () => {
            const plaintext = 'my-secret-token';
            const encrypted = encryptToken(plaintext);
            const decrypted = decryptToken(encrypted);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should return original string if not encrypted format', () => {
            const plaintext = 'not-encrypted';
            expect(decryptToken(plaintext)).toBe(plaintext);
        });

        it('should return empty string for empty input', () => {
            expect(decryptToken('')).toBe('');
        });
    });

    describe('generateSecureToken', () => {
        it('should generate a token of correct length', () => {
            const token = generateSecureToken(32);
            expect(token.length).toBe(64); // hex encoding doubles length
        });

        it('should generate unique tokens', () => {
            const token1 = generateSecureToken();
            const token2 = generateSecureToken();
            
            expect(token1).not.toBe(token2);
        });
    });
});
