export class ContentCleaner {
    /**
     * Cleans email body by removing noise, quoted replies, and footers.
     * Ported from Python ContentCleaner.
     */
    static cleanEmailBody(text: string): string {
        if (!text) return "";
        const originalText = text;

        // 0. Lightweight HTML -> Markdown Conversion
        
        // Structure: <br>, <p> -> Newlines
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<\/p>/gi, '\n\n');
        text = text.replace(/<p.*?>/gi, ''); // Open p tags just gone
        
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

        const lines = text.split('\n');
        const cleanedLines: string[] = [];
        
        // Heuristics for reply headers
        const replyHeaderPatterns = [
            /^On .* wrote:$/i,
            /^From: .*$/i,
            /^Sent: .*$/i,
            /^To: .*$/i,
            /^Subject: .*$/i
        ];

        // Heuristics for footers
        const footerPatterns = [
            /unsubscribe/i,
            /privacy policy/i,
            /terms of service/i,
            /view in browser/i,
            /copyright \d{4}/i
        ];

        for (let line of lines) {
            let lineStripped = line.trim();
            
            // 2. Quoted text removal (lines starting with >)
            if (lineStripped.startsWith('>')) {
                continue;
            }
                
            // 3. Check for specific reply separators
            // If we hit a reply header, we truncate the rest
            if (/^On .* wrote:$/i.test(lineStripped)) {
                break;
            }

            // 4. Footer removal (only on very short lines to avoid stripping body content)
            if (lineStripped.length < 60) {
                let isFooter = false;
                for (const pattern of footerPatterns) {
                    if (pattern.test(lineStripped)) {
                        isFooter = true;
                        break;
                    }
                }
                if (isFooter) {
                    continue;
                }
            }

            cleanedLines.push(line);
        }

        // Reassemble
        text = cleanedLines.join('\n');
        
        // Safety Fallback: If cleaning stripped everything, return original (truncated)
        if (!text.trim() || text.length < 10) {
            text = originalText.substring(0, 3000);
        }

        // Collapse multiple newlines
        text = text.replace(/\n{3,}/g, '\n\n');

        // Sanitize LLM Special Tokens
        text = text.replace(/<\|/g, '< |'); 
        text = text.replace(/\|>/g, '| >');
        text = text.replace(/\[INST\]/gi, '[ INST ]');
        text = text.replace(/\[\/INST\]/gi, '[ /INST ]');
        text = text.replace(/<s>/gi, '&lt;s&gt;');
        text = text.replace(/<\/s>/gi, '&lt;/s&gt;');
        
        return text.trim();
    }
}
