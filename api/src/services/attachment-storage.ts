import { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import crypto from 'crypto';

const logger = createLogger('AttachmentStorage');

const BUCKET_NAME = 'email-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface AttachmentMetadata {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    uploaded_at: string;
}

export class AttachmentStorageService {
    /**
     * Upload a file to Supabase Storage
     */
    async uploadAttachment(
        supabase: SupabaseClient,
        userId: string,
        emailId: string,
        file: Buffer,
        filename: string,
        mimetype: string
    ): Promise<AttachmentMetadata> {
        // Validate file size
        if (file.length > MAX_FILE_SIZE) {
            throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        // Generate unique file ID and path
        const fileId = crypto.randomUUID();
        const ext = filename.split('.').pop() || '';
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${userId}/${emailId}/${fileId}_${safeName}`;

        try {
            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, file, {
                    contentType: mimetype,
                    upsert: false
                });

            if (error) {
                logger.error('Supabase upload failed', error, { storagePath });
                throw new Error(`Upload failed: ${error.message}`);
            }

            logger.info('Attachment uploaded', { storagePath, size: file.length });

            return {
                id: fileId,
                name: filename,
                path: storagePath,
                size: file.length,
                type: mimetype,
                uploaded_at: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to upload attachment', error, { filename, emailId });
            throw error;
        }
    }

    /**
     * Download attachment from Supabase Storage
     */
    async downloadAttachment(
        supabase: SupabaseClient,
        storagePath: string
    ): Promise<Buffer> {
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .download(storagePath);

            if (error) {
                logger.error('Supabase download failed', error, { storagePath });
                throw new Error(`Download failed: ${error.message}`);
            }

            if (!data) {
                throw new Error('No data returned from storage');
            }

            // Convert Blob to Buffer
            const arrayBuffer = await data.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            logger.error('Failed to download attachment', error, { storagePath });
            throw error;
        }
    }

    /**
     * Delete attachment from Supabase Storage
     */
    async deleteAttachment(
        supabase: SupabaseClient,
        storagePath: string
    ): Promise<void> {
        try {
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([storagePath]);

            if (error) {
                logger.error('Supabase delete failed', error, { storagePath });
                throw new Error(`Delete failed: ${error.message}`);
            }

            logger.info('Attachment deleted', { storagePath });
        } catch (error) {
            logger.error('Failed to delete attachment', error, { storagePath });
            throw error;
        }
    }

    /**
     * Delete all attachments for an email
     */
    async deleteEmailAttachments(
        supabase: SupabaseClient,
        attachments: AttachmentMetadata[]
    ): Promise<void> {
        if (attachments.length === 0) return;

        const paths = attachments.map(a => a.path);

        try {
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove(paths);

            if (error) {
                logger.error('Supabase bulk delete failed', error, { paths });
                throw new Error(`Bulk delete failed: ${error.message}`);
            }

            logger.info('Attachments deleted', { count: paths.length });
        } catch (error) {
            logger.error('Failed to delete email attachments', error, { count: paths.length });
            throw error;
        }
    }

    /**
     * Get public URL for attachment (if bucket is public)
     * For private buckets, use downloadAttachment instead
     */
    getPublicUrl(supabase: SupabaseClient, storagePath: string): string {
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        return data.publicUrl;
    }
}

let instance: AttachmentStorageService | null = null;

export function getAttachmentStorageService(): AttachmentStorageService {
    if (!instance) {
        instance = new AttachmentStorageService();
    }
    return instance;
}
