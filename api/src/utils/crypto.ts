import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { config } from '../config/index.js';

// Edge Functions compatible encryption (matching supabase/functions/_shared/encryption.ts)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Match Edge Functions
const KEY_LENGTH = 32;

function getKey(): Buffer {
    const secret = config.security.encryptionKey || 'dev-key-not-secure';
    // Match Edge Functions key derivation: pad/slice to 32 chars
    return Buffer.from(secret.padEnd(32, '0').slice(0, 32), 'utf8');
}

export function encryptToken(plaintext: string): string {
    if (!plaintext) return '';
    
    const iv = randomBytes(IV_LENGTH);
    const key = getKey();
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Format: base64(iv + ciphertext + tag) - compatible with Edge Functions
    const combined = Buffer.concat([iv, encrypted, tag]);
    return combined.toString('base64');
}

export function decryptToken(encrypted: string): string {
    if (!encrypted) return '';
    
    try {
        // Try Edge Functions format first: base64(iv + ciphertext + tag)
        const combined = Buffer.from(encrypted, 'base64');
        
        if (combined.length < IV_LENGTH + 16) {
            // Too short, might be plaintext
            return encrypted;
        }
        
        const iv = combined.subarray(0, IV_LENGTH);
        const tag = combined.subarray(combined.length - 16);
        const data = combined.subarray(IV_LENGTH, combined.length - 16);
        const key = getKey();
        
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (error) {
        // Try legacy format: salt:iv:tag:encrypted
        try {
            const parts = encrypted.split(':');
            if (parts.length === 4) {
                const [saltB64, ivB64, tagB64, dataB64] = parts;
                const salt = Buffer.from(saltB64, 'base64');
                const iv = Buffer.from(ivB64, 'base64');
                const tag = Buffer.from(tagB64, 'base64');
                const data = Buffer.from(dataB64, 'base64');
                const secret = config.security.encryptionKey || 'dev-key-not-secure';
                const key = scryptSync(secret, salt, KEY_LENGTH);
                
                const decipher = createDecipheriv(ALGORITHM, key, iv);
                decipher.setAuthTag(tag);
                
                return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
            }
        } catch {
            // Fall through to plaintext
        }
        
        // If all decryption fails, assume plaintext (for migration)
        return encrypted;
    }
}

export function generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
}
