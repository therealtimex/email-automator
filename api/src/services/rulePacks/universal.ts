/**
 * Universal Pack - Essential Rules for Everyone
 *
 * These 4 rules provide immediate value to all users regardless of role.
 * They're safe, conservative, and focus on noise reduction and organization.
 */

import { RulePack } from './types.js';

export const UNIVERSAL_PACK: RulePack = {
  id: 'universal',
  name: 'Universal Pack',
  description: 'Essential automation rules that help everyone stay organized',
  icon: '📦',
  enabled_by_default: true,
  target_roles: undefined, // Available to all roles
  rules: [
    {
      id: 'universal-newsletters',
      name: '📚 Newsletter Sweeper',
      intent: 'Keep newsletters organized and out of main inbox',
      description: 'Automatically archives newsletters and mass-marketing emails so you can read them later without inbox clutter',
      condition: {
        category: 'newsletter',
        confidence_gt: 0.7
      },
      actions: ['archive', 'read'],
      priority: 10,
      is_enabled_by_default: true
    },
    {
      id: 'universal-cold-outreach',
      name: '❄️ Cold Outreach Filter',
      intent: 'Filter unsolicited sales and marketing emails',
      description: 'Identifies and archives cold emails from unknown senders with sales language',
      condition: {
        or: [
          {
            // High-confidence promotional emails that are first contact
            category: 'promotional',
            confidence_gt: 0.85,
            is_first_contact: true
          },
          {
            // Spam category (very high confidence)
            category: 'spam',
            confidence_gt: 0.9
          }
        ]
      },
      actions: ['archive'],
      priority: 20,
      is_enabled_by_default: true
    },
    {
      id: 'universal-cc-organizer',
      name: '👀 CC/FYI Organizer',
      intent: 'Keep inbox focused on direct communications',
      description: 'Archives emails where you\'re CC\'d in group threads, keeping your inbox for direct messages',
      condition: {
        recipient_type: 'cc',
        recipient_count_gt: 3  // Group emails (more than 3 recipients)
      },
      actions: ['archive'],
      priority: 5,
      is_enabled_by_default: true
    },
    {
      id: 'universal-receipts',
      name: '🧾 Receipt Organizer',
      intent: 'Auto-label receipts for easy tax and expense retrieval',
      description: 'Labels transactional emails (receipts, invoices, confirmations) for easy searching',
      condition: {
        category: 'transactional',
        contains_keywords: ['receipt', 'invoice', 'payment', 'order confirmation', 'purchase'],
        confidence_gt: 0.75
      },
      actions: ['label:Finance/Receipts'],
      priority: 15,
      is_enabled_by_default: true
    }
  ]
};
