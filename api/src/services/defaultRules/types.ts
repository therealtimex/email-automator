/**
 * Default Rule Type Definitions
 *
 * Default rules are pre-configured automation rules organized by category.
 * They enable zero-configuration UX by providing smart defaults that users can enable.
 */

export type EmailCategory =
  | 'spam'
  | 'newsletter'
  | 'news'
  | 'promotional'
  | 'transactional'
  | 'social'
  | 'support'
  | 'client'
  | 'internal'
  | 'personal'
  | 'notification'
  | 'other';

export type EmailAction =
  | 'delete'
  | 'archive'
  | 'draft'
  | 'star'
  | 'unstar'
  | 'important'
  | 'pin'
  | `label:${string}`
  | `forward:${string}`;

export type RecipientType = 'to' | 'cc' | 'bcc';

export type EmailSentiment = 'sales' | 'urgent' | 'casual' | 'formal';

export type Priority = 'High' | 'Medium' | 'Low';

/**
 * Enhanced rule condition supporting AI-powered matching
 */
export interface EnhancedRuleCondition {
  // Legacy field-based matching (kept for backwards compatibility)
  field?: 'subject' | 'sender' | 'body';
  operator?: 'equals' | 'contains' | 'domain_equals';
  value?: string;

  // AI-powered conditions (leverage intelligence service)
  category?: EmailCategory;          // AI categorization (newsletter, spam, etc.)
  sentiment?: EmailSentiment;        // AI tone detection
  confidence_gt?: number;            // Minimum AI confidence (0.0 to 1.0)

  // AI priority and quality
  ai_priority?: Priority;            // AI-assigned priority
  is_useless?: boolean;              // AI-detected low-value email

  // Recipient analysis
  recipient_type?: RecipientType;    // Where user appears (to/cc/bcc)
  recipient_count_gt?: number;       // Number of recipients threshold
  is_first_contact?: boolean;        // No prior thread with sender

  // Content matching
  contains_keywords?: string[];      // Any of these words (case-insensitive)
  matches_pattern?: string;          // Regex pattern

  // Sender analysis
  sender_domain?: string;            // Match sender domain
  sender_in_contacts?: boolean;      // Is sender in user's contacts
  sender_is_vip?: boolean;           // Is sender in VIP list

  // Time-based
  older_than_days?: number;          // Email age threshold

  // Logical operators for complex conditions
  and?: EnhancedRuleCondition[];     // All must match
  or?: EnhancedRuleCondition[];      // Any must match
  not?: EnhancedRuleCondition;       // Must NOT match
}

/**
 * Rule category types for organization
 */
export type RuleCategory =
  | 'email_organization'   // Newsletter cleanup, spam management
  | 'priority_alerts'      // Urgent/important email handling
  | 'development'          // GitHub, CI/CD, code review notifications
  | 'sales_business'       // Client communication, proposals
  | 'operations'           // Support tickets, monitoring alerts
  | 'custom';              // User-defined rules

/**
 * Default rule definition
 */
export interface DefaultRule {
  id: string;                        // Unique rule ID (e.g., 'newsletters-auto-archive')
  category: RuleCategory;            // Rule category for organization
  name: string;                      // Display name with emoji (e.g., '📚 Newsletter Sweeper')
  intent: string;                    // Human-readable purpose
  description?: string;              // Detailed explanation
  condition: EnhancedRuleCondition;  // When this rule applies
  actions: EmailAction[];            // What to do
  instructions?: string;             // Draft generation instructions (if action includes 'draft')
  priority?: number;                 // Evaluation order (higher = first)
  is_enabled_by_default: boolean;    // Should be enabled by default
}
