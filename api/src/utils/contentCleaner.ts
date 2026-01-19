export class ContentCleaner {
    /**
     * Cleans email body by removing noise, quoted replies, and footers.
     * optimized for LLM processing.
     */
    static cleanEmailBody(text: string): string {
        if (!text) return "";
        const originalText = text;

        // 1. Detect if content is actually HTML
        const isHtml = /<[a-z][\s\S]*>/i.test(text);

        if (isHtml) {
            // Lightweight HTML -> Markdown Conversion
            // Structure: <br>, <p> -> Newlines
            text = text.replace(/<br\s*\/?>/gi, '\n');
            text = text.replace(/<\/p>/gi, '\n\n');
            text = text.replace(/<p.*?>/gi, ''); 
            
            // Structure: Headers <h1>-<h6> -> # Title
            text = text.replace(/<h[1-6].*?>(.*?)<\/h[1-6]>/gsi, (match, p1) => `\n# ${p1}\n`);
            
            // Structure: Lists <li> -> - Item
            text = text.replace(/<li.*?>(.*?)<\/li>/gsi, (match, p1) => `\n- ${p1}`);
            text = text.replace(/<ul.*?>/gi, '');
            text = text.replace(/<\/ul>/gi, '\n');
            
            // Links: <a href=\"...\">text</a> -> [text](href)
            text = text.replace(/<a\s+(?:[^>]*?\s+)?href=\"([^\"]*)\"[^>]*>(.*?)<\/a>/gsi, (match, href, content) => `[${content}](${href})`);
            
            // Images: <img src=\"...\" alt=\"...\"> -> ![alt](src)
            text = text.replace(/<img\s+(?:[^>]*?\s+)?src=\"([^\"]*)\"(?:[^>]*?\s+)?alt=\"([^\"]*)\"[^>]*>/gsi, (match, src, alt) => `![${alt}](${src})`);

            // Style/Script removal (strictly remove content)
            text = text.replace(/<script.*?>.*?<\/script>/gsi, '');
            text = text.replace(/<style.*?>.*?<\/style>/gsi, '');
            
            // Final Strip of remaining tags
            text = text.replace(/<[^>]+>/g, ' ');
            
            // Entity decoding (Basic)
            text = text.replace(/&nbsp;/gi, ' ');
            text = text.replace(/&amp;/gi, '&');
            text = text.replace(/&lt;/gi, '<');
            text = text.replace(/&gt;/gi, '>');
            text = text.replace(/&quot;/gi, '"');
            text = text.replace(/&#39;/gi, "'");
        }

        const lines = text.split('\n');
        const cleanedLines: string[] = [];
        
        // Patterns that usually mark the START of a reply chain or a generic footer
        const truncationPatterns = [
            /^On .* wrote:$/i,
            /^From: .* <.*>$/i,
            /^-----Original Message-----$/i,
            /^________________________________$/i,
            /^Sent from my iPhone$/i,
            /^Sent from my Android$/i,
            /^Get Outlook for/i,
            /^--$/ // Standard signature separator
        ];

        // Patterns for lines that should be stripped but NOT truncate the whole email
        const noisePatterns = [
            /view in browser/i,
            /click here to view/i,
            /legal notice/i,
            /all rights reserved/i,
            /privacy policy/i,
            /terms of service/i,
            /unsubscribe/i
        ];

        for (let line of lines) {
            let lineStripped = line.trim();
            if (!lineStripped) {
                cleanedLines.push("");
                continue;
            }
            
            // 2. Quoted text removal (lines starting with >)
            if (lineStripped.startsWith('>')) {
                continue;
            }
                
            // 3. Truncation check: If we hit a reply header, we stop entirely
            let shouldTruncate = false;
            for (const pattern of truncationPatterns) {
                if (pattern.test(lineStripped)) {
                    shouldTruncate = true;
                    break;
                }
            }
            if (shouldTruncate) break;

            // 4. Noise check: Strip boilerplate lines
            let isNoise = false;
            if (lineStripped.length < 100) {
                for (const pattern of noisePatterns) {
                    if (pattern.test(lineStripped)) {
                        isNoise = true;
                        break;
                    }
                }
            }
            if (isNoise) continue;

            cleanedLines.push(line);
        }

        // Reassemble
        text = cleanedLines.join('\n');
        
        // Collapse whitespace
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/[ \t]{2,}/g, ' ');

        // Safety Fallback: If cleaning stripped too much, return original text truncated
        if (text.trim().length < 20 && originalText.trim().length > 20) {
            return originalText.substring(0, 3000).trim();
        }
        
        // Sanitize LLM Special Tokens
        text = text.replace(/<\|/g, '< |'); 
        text = text.replace(/\|>/g, '| >');
        text = text.replace(/\[INST\]/gi, '[ INST ]');
        text = text.replace(/\[\/INST\]/gi, '[ /INST ]');
        
        return text.trim();
    }
}
