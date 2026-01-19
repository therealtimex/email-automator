import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('StorageService');

export class StorageService {
    private defaultPath: string;

    constructor() {
        // Default to a folder in the user's home directory or current project
        // Using project-relative path for now as discussed
        this.defaultPath = path.resolve(process.cwd(), 'data', 'emails');
    }

    /**
     * Ensures the storage directory exists and is writable.
     */
    async ensureDirectory(customPath?: string | null): Promise<string> {
        const targetPath = customPath || this.defaultPath;
        try {
            await fs.mkdir(targetPath, { recursive: true });
            // Test writability
            const testFile = path.join(targetPath, '.write_test');
            await fs.writeFile(testFile, 'ok');
            await fs.unlink(testFile);
            return targetPath;
        } catch (error) {
            logger.error('Storage directory validation failed', error, { targetPath });
            throw new Error(`Storage path "${targetPath}" is not accessible or writable.`);
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
