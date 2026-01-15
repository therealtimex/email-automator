// Token encryption utilities for securing OAuth credentials
// Uses Web Crypto API available in Deno

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable not set');
  }
  return key;
}

// Convert string key to CryptoKey
async function getKey(): Promise<CryptoKey> {
  const keyString = getEncryptionKey();
  const keyData = new TextEncoder().encode(keyString.padEnd(32, '0').slice(0, 32));

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

// Decrypt data
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getKey();

  // Convert from base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const encrypted = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}
