import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';

// Mutable key - loaded from database on startup (no env var fallback in sandbox)
// In RealTimeX Desktop sandbox, all config is stored in Supabase
let secretKey: Buffer | null = null;

export function setEncryptionKey(hexKey: string) {
    if (!hexKey || hexKey.length !== 64) { // 32 bytes = 64 hex chars
        throw new Error('Invalid encryption key format. Must be 32-byte hex string.');
    }
    secretKey = Buffer.from(hexKey, 'hex');
    // console.debug('Encryption key updated from persistence');
}

function getKey(): Buffer {
    if (!secretKey) {
        throw new Error(
            'Encryption key not initialized. IMAP accounts require encryption. ' +
            'Ensure you have completed the Setup Wizard and Supabase is properly configured. ' +
            'Database migrations must be applied and user_settings table must exist. ' +
            'Check server logs for initialization errors.'
        );
    }
    return secretKey;
}

export function encrypt(text: string): { iv: string; content: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
        iv: iv.toString('hex'),
        content: encrypted,
        tag: cipher.getAuthTag().toString('hex')
    };
}

export function decrypt(encrypted: { iv: string; content: string; tag: string }): string {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(encrypted.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));

    let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
