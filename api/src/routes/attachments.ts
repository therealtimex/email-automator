import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { apiRateLimit } from '../middleware/rateLimit.js';
import { getAttachmentStorageService, AttachmentMetadata } from '../services/attachment-storage.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('AttachmentRoutes');

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now
        // Can add restrictions later if needed
        cb(null, true);
    }
});

// Upload attachment to draft
router.post('/:emailId/attachments',
    apiRateLimit,
    authMiddleware,
    upload.single('file'),
    asyncHandler(async (req, res) => {
        const emailId = req.params.emailId as string;
        const userId = req.user!.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Verify email ownership and get current attachments
        const { data: email, error } = await req.supabase!
            .from('emails')
            .select('id, attachments, email_accounts!inner(user_id)')
            .eq('id', emailId)
            .eq('email_accounts.user_id', userId)
            .single();

        if (error || !email) {
            throw new NotFoundError('Email');
        }

        try {
            // Upload to Supabase Storage
            const attachmentService = getAttachmentStorageService();
            const metadata = await attachmentService.uploadAttachment(
                req.supabase!,
                userId,
                emailId,
                file.buffer,
                file.originalname,
                file.mimetype
            );

            // Update email attachments array in database
            const currentAttachments = (Array.isArray(email.attachments) ? email.attachments : []) as AttachmentMetadata[];
            const updatedAttachments = [...currentAttachments, metadata];

            const { error: updateError } = await req.supabase!
                .from('emails')
                .update({ attachments: updatedAttachments })
                .eq('id', emailId);

            if (updateError) {
                // Rollback: delete uploaded file
                await attachmentService.deleteAttachment(req.supabase!, metadata.path);
                throw updateError;
            }

            logger.info('Attachment uploaded and saved', {
                emailId,
                attachmentId: metadata.id,
                filename: metadata.name
            });

            res.json({
                success: true,
                attachment: metadata
            });
        } catch (error: any) {
            logger.error('Failed to upload attachment', error, { emailId, filename: file.originalname });
            res.status(500).json({
                error: 'Failed to upload attachment',
                details: error.message
            });
        }
    })
);

// Delete attachment from draft
router.delete('/:emailId/attachments/:attachmentId',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const emailId = req.params.emailId as string;
        const attachmentId = req.params.attachmentId as string;
        const userId = req.user!.id;

        // Verify email ownership and get current attachments
        const { data: email, error } = await req.supabase!
            .from('emails')
            .select('id, attachments, email_accounts!inner(user_id)')
            .eq('id', emailId)
            .eq('email_accounts.user_id', userId)
            .single();

        if (error || !email) {
            throw new NotFoundError('Email');
        }

        const currentAttachments = (Array.isArray(email.attachments) ? email.attachments : []) as AttachmentMetadata[];
        const attachment = currentAttachments.find(a => a.id === attachmentId);

        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        try {
            // Delete from Supabase Storage
            const attachmentService = getAttachmentStorageService();
            await attachmentService.deleteAttachment(req.supabase!, attachment.path);

            // Update email attachments array in database
            const updatedAttachments = currentAttachments.filter(a => a.id !== attachmentId);

            const { error: updateError } = await req.supabase!
                .from('emails')
                .update({ attachments: updatedAttachments })
                .eq('id', emailId);

            if (updateError) throw updateError;

            logger.info('Attachment deleted', {
                emailId,
                attachmentId,
                filename: attachment.name
            });

            res.json({ success: true });
        } catch (error: any) {
            logger.error('Failed to delete attachment', error, { emailId, attachmentId });
            res.status(500).json({
                error: 'Failed to delete attachment',
                details: error.message
            });
        }
    })
);

// Download attachment (for preview/download functionality)
router.get('/:emailId/attachments/:attachmentId',
    apiRateLimit,
    authMiddleware,
    asyncHandler(async (req, res) => {
        const emailId = req.params.emailId as string;
        const attachmentId = req.params.attachmentId as string;
        const userId = req.user!.id;

        // Verify email ownership and get attachment metadata
        const { data: email, error } = await req.supabase!
            .from('emails')
            .select('id, attachments, email_accounts!inner(user_id)')
            .eq('id', emailId)
            .eq('email_accounts.user_id', userId)
            .single();

        if (error || !email) {
            throw new NotFoundError('Email');
        }

        const currentAttachments = (Array.isArray(email.attachments) ? email.attachments : []) as AttachmentMetadata[];
        const attachment = currentAttachments.find(a => a.id === attachmentId);

        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        try {
            // Download from Supabase Storage
            const attachmentService = getAttachmentStorageService();
            const fileBuffer = await attachmentService.downloadAttachment(
                req.supabase!,
                attachment.path
            );

            // Set response headers
            res.setHeader('Content-Type', attachment.type);
            res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
            res.setHeader('Content-Length', attachment.size);

            res.send(fileBuffer);
        } catch (error: any) {
            logger.error('Failed to download attachment', error, { emailId, attachmentId });
            res.status(500).json({
                error: 'Failed to download attachment',
                details: error.message
            });
        }
    })
);

export default router;
