/**
 * Utility for generating standardized and human-readable filenames for archived emails.
 */

interface FilenameOptions {
    subject: string;
    date: Date;
    externalId: string;
    intelligentRename?: boolean;
}

export function generateEmailFilename({
    subject,
    date,
    externalId,
    intelligentRename = false
}: FilenameOptions): string {
    // 1. Format Timestamp (YYYYMMDD_HHMM or YYYYMMDD-HHMM)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());

    const timestamp = intelligentRename 
        ? `${yyyy}${mm}${dd}-${hh}${min}`
        : `${yyyy}${mm}${dd}_${hh}${min}`;

    // 2. Get Internal ID (Last 8 characters of provider's message ID)
    const internalId = externalId.slice(-8);

    if (intelligentRename) {
        // Intelligent Rename (Slugified)
        // subject converted to lowercase, non-alphanumeric to hyphens
        const slug = subject
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
            .substring(0, 100);
        
        return `${timestamp}-${slug || 'no-subject'}-${internalId}.eml`;
    } else {
        // Default Naming Convention
        // Illegal characters replaced with underscores, non-printable removed
        const sanitized = subject
            .replace(/[/\\*?:\"<>|]/g, '_') // Illegal chars
            .replace(/[\x00-\x1F\x7F]/g, '') // Non-printable
            .replace(/_+/g, '_') // Collapse multiple underscores
            .replace(/^_|_$/g, '') // Remove leading/trailing underscores
            .substring(0, 100);

        return `${timestamp}_${sanitized || 'No_Subject'}_${internalId}.eml`;
    }
}
