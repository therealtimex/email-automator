import crypto from 'crypto';
import { setEncryptionKey, getEncryptionKeyHex } from '../utils/encryption.js';
import { getServiceRoleSupabase } from './supabase.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('EncryptionInit');

let isEncryptionInitialized = false;

/**
 * Initialize encryption key from Supabase or generate a new one.
 * In BYOK mode, this might be called multiple times as different Supabase clients become available.
 * 
 * @param providedSupabase Optional Supabase client (service role recommended)
 */
export async function initializePersistenceEncryption(providedSupabase?: any) {
    try {
        const supabase = providedSupabase || getServiceRoleSupabase();

        if (!supabase) {
            // BYOK mode: Supabase not configured at startup (credentials come via HTTP headers)
            // If we don't have a key yet, generate a temporary one in memory
            if (!getEncryptionKeyHex()) {
                logger.info('Supabase not configured yet (BYOK mode)');
                logger.info('Generating temporary encryption key in memory - will be reconciled when Supabase becomes available');
                const newKey = crypto.randomBytes(32).toString('hex');
                setEncryptionKey(newKey);
                logger.info('✓ Temporary encryption key generated and loaded in memory');
            }
            return;
        }

        // 1. Check if ANY user has an encryption key stored
        // In sandbox mode, encryption key is always in database
        const { data: users, error } = await supabase
            .from('user_settings')
            .select('user_id, encryption_key')
            .not('encryption_key', 'is', null)
            .limit(1);

        if (error) {
            logger.warn('Failed to query user_settings for encryption key', { error });
            // If no key in memory, generate one as fallback
            if (!getEncryptionKeyHex()) {
                const newKey = crypto.randomBytes(32).toString('hex');
                setEncryptionKey(newKey);
                logger.info('✓ Generated fallback encryption key due to DB error');
            }
            return;
        }

        if (users && users.length > 0 && users[0].encryption_key) {
            // Found a persisted key in database
            const dbKey = users[0].encryption_key;
            const currentKey = getEncryptionKeyHex();

            if (currentKey && currentKey !== dbKey) {
                logger.warn('⚠️ In-memory encryption key differs from database. Overwriting with DB key to ensure consistency across instances.');
            }

            logger.info('✓ Loaded encryption key from database');
            setEncryptionKey(dbKey);
            isEncryptionInitialized = true;
            return;
        }

        // 2. No key in database - use in-memory key or generate and persist
        // This happens on first run or after fresh database setup
        let finalKey = getEncryptionKeyHex();
        if (!finalKey) {
            logger.info('No encryption key found in database or memory, generating new key...');
            finalKey = crypto.randomBytes(32).toString('hex');
            setEncryptionKey(finalKey);
        } else {
            logger.info('Persisting in-memory encryption key to new Supabase instance...');
        }

        // 3. Persist to all existing users in database
        const { data: allUsers } = await supabase
            .from('user_settings')
            .select('user_id')
            .limit(100);

        if (allUsers && allUsers.length > 0) {
            logger.info(`Saving encryption key to database for ${allUsers.length} user(s)...`);

            // Update all users with the new key
            const updates = allUsers.map((user: any) =>
                supabase
                    .from('user_settings')
                    .update({ encryption_key: finalKey })
                    .eq('user_id', user.user_id)
            );

            await Promise.all(updates);
            logger.info('✓ Encryption key saved to database');
        } else {
            logger.info('No users found yet, encryption key loaded in memory');
            logger.info('Key will be persisted when users are created');
        }

        isEncryptionInitialized = true;
    } catch (err) {
        logger.error('Error initializing encryption:', err);
        // Always ensure we have a key, even if there was an error
        if (!getEncryptionKeyHex()) {
            logger.warn('Generating emergency fallback encryption key');
            const fallbackKey = crypto.randomBytes(32).toString('hex');
            setEncryptionKey(fallbackKey);
        }
    }
}

/**
 * Periodic sync: Persist in-memory encryption key to users without one
 * This handles the "first user" case and any users created before key was persisted
 */
export async function syncEncryptionKeyToUsers() {
    try {
        const supabase = getServiceRoleSupabase();
        if (!supabase) return;

        const currentKey = getEncryptionKeyHex();
        if (!currentKey) return; // No key in memory yet

        // Find users without encryption key
        const { data: usersWithoutKey, error } = await supabase
            .from('user_settings')
            .select('user_id')
            .is('encryption_key', null)
            .limit(100);

        if (error || !usersWithoutKey || usersWithoutKey.length === 0) {
            return; // No users to update
        }

        logger.info(`Found ${usersWithoutKey.length} user(s) without encryption key, persisting...`);

        // Update all users without a key
        const updates = usersWithoutKey.map((user: any) =>
            supabase
                .from('user_settings')
                .update({ encryption_key: currentKey })
                .eq('user_id', user.user_id)
        );

        await Promise.all(updates);
        logger.info(`✓ Persisted encryption key to ${usersWithoutKey.length} user(s)`);
    } catch (err) {
        logger.warn('Error syncing encryption key to users:', { error: err });
    }
}

export function isEncryptionReady() {
    return isEncryptionInitialized;
}
