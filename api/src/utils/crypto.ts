import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(salt: Buffer): Buffer {
    const secret = config.security.encryptionKey || 'dev-key-not-secure';
    return scryptSync(secret, salt, KEY_LENGTH);
}

export function encryptToken(plaintext: string): string {
    if (!plaintext) return '';
    
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = getKey(salt);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Format: salt:iv:tag:encrypted (all base64)
    return [
        salt.toString('base64'),
        iv.toString('base64'),
        tag.toString('base64'),
        encrypted.toString('base64'),
    ].join(':');
}

export function decryptToken(encrypted: string): string {
    if (!encrypted) return '';
    
    try {
        const [saltB64, ivB64, tagB64, dataB64] = encrypted.split(':');
        if (!saltB64 || !ivB64 || !tagB64 || !dataB64) {
            // Assume it's plaintext (legacy/unencrypted)
            return encrypted;
        }
        
        const salt = Buffer.from(saltB64, 'base64');
        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, 'base64');
        const data = Buffer.from(dataB64, 'base64');
        const key = getKey(salt);
        
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (error) {
        // If decryption fails, assume plaintext (for migration)
        return encrypted;
    }
}

export function generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
}
