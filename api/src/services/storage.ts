import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('StorageService');

export class StorageService {
    private defaultPath: string;

    constructor() {
        // Determine a safe default path
        const homeDir = os.homedir();
        const fallbackPath = path.join(homeDir, '.email-automator', 'emails');
        const projectDataPath = path.resolve(process.cwd(), 'data', 'emails');

        // If we are at system root or in a restricted environment, use home dir
        if (process.cwd() === '/' || process.cwd() === '/root' || process.cwd().startsWith('/bin')) {
            this.defaultPath = fallbackPath;
        } else {
            // Default to project-relative for now, but ensureDirectory will handle the check
            this.defaultPath = projectDataPath;
        }
    }

    /**
     * Ensures the storage directory exists and is writable.
     */
    async ensureDirectory(customPath?: string | null): Promise<string> {
        let targetPath = customPath || this.defaultPath;
        
        try {
            await fs.mkdir(targetPath, { recursive: true });
            // Test writability
            const testFile = path.join(targetPath, '.write_test');
            await fs.writeFile(testFile, 'ok');
            await fs.unlink(testFile);
            return targetPath;
        } catch (error) {
            // If the default project-relative path failed and we haven't tried the fallback yet
            if (!customPath && targetPath !== path.join(os.homedir(), '.email-automator', 'emails')) {
                const fallback = path.join(os.homedir(), '.email-automator', 'emails');
                logger.warn('Default storage path not writable, falling back to home directory', { targetPath, fallback });
                return this.ensureDirectory(fallback);
            }

            logger.error('Storage directory validation failed', error, { targetPath });
            throw new Error(`Storage path "${targetPath}" is not accessible or writable. Please configure a valid path in Settings.`);
        }
    }

    /**
     * Saves raw email content to disk.
     * Returns the absolute path to the saved file.
     */
    async saveEmail(content: string, filename: string, customPath?: string | null): Promise<string> {
        const baseDir = await this.ensureDirectory(customPath);
        const filePath = path.join(baseDir, filename);
        
        try {
            await fs.writeFile(filePath, content, 'utf8');
            logger.debug('Email saved to disk', { filePath });
            return filePath;
        } catch (error) {
            logger.error('Failed to save email to disk', error, { filePath });
            throw error;
        }
    }

    /**
     * Reads email content from disk.
     */
    async readEmail(filePath: string): Promise<string> {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            logger.error('Failed to read email from disk', error, { filePath });
            throw error;
        }
    }

    /**
     * Deletes email from disk.
     */
    async deleteEmail(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
            logger.debug('Email deleted from disk', { filePath });
        } catch (error) {
            // If file doesn't exist, we don't care much
            if ((error as any).code !== 'ENOENT') {
                logger.warn('Failed to delete email from disk', { error, filePath });
            }
        }
    }
}

let storageService: StorageService | null = null;

export function getStorageService(): StorageService {
    if (!storageService) {
        storageService = new StorageService();
    }
    return storageService;
}
