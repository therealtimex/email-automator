/**
 * Rule Pack Type Definitions
 *
 * Rule packs are pre-configured sets of automation rules designed for specific user roles
 * or use cases. They enable zero-configuration UX by providing smart defaults.
 */

export type EmailCategory =
  | 'newsletter'
  | 'promotional'
  | 'spam'
  | 'transactional'
  | 'social'
  | 'support'
  | 'client'
  | 'internal'
  | 'personal'
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
 * Rule template definition
 */
export interface RuleTemplate {
  id: string;                        // Unique template ID (e.g., 'universal-newsletters')
  name: string;                      // Display name with emoji (e.g., '📚 Newsletter Sweeper')
  intent: string;                    // Human-readable purpose
  description?: string;              // Detailed explanation
  condition: EnhancedRuleCondition;  // When this rule applies
  actions: EmailAction[];            // What to do
  instructions?: string;             // Draft generation instructions (if action includes 'draft')
  priority?: number;                 // Evaluation order (higher = first)
  is_enabled_by_default: boolean;    // Should be enabled when installed
}

/**
 * Rule pack definition
 */
export interface RulePack {
  id: string;                        // Pack identifier (e.g., 'universal', 'executive')
  name: string;                      // Display name (e.g., 'Universal Pack')
  description: string;               // What this pack does
  icon?: string;                     // Emoji or icon identifier
  rules: RuleTemplate[];             // Rule templates in this pack
  enabled_by_default: boolean;       // Auto-install for matching users
  target_roles?: string[];           // Which roles this pack is designed for
}

/**
 * User role types for personalization
 */
export type UserRole =
  | 'executive'      // Leadership, CEO, VP
  | 'developer'      // Software engineers, DevOps
  | 'sales'          // Sales, Business Development
  | 'operations'     // Support, Operations, Customer Success
  | 'marketing'      // Marketing, Growth
  | 'other';         // Manual setup, no personalization
