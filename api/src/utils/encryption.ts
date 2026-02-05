import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';

// Mutable key - initially populated from env if available (for backward compatibility), 
// but intended to be overwritten by DB-stored key on startup.
let secretKey: Buffer | null = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : null;

export function setEncryptionKey(hexKey: string) {
    if (!hexKey || hexKey.length !== 64) { // 32 bytes = 64 hex chars
        throw new Error('Invalid encryption key format. Must be 32-byte hex string.');
    }
    secretKey = Buffer.from(hexKey, 'hex');
    // console.debug('Encryption key updated from persistence');
}

function getKey(): Buffer {
    if (!secretKey) {
        throw new Error('Encryption key not initialized. Ensure server has loaded settings from DB.');
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
