/**
 * Email Organization Rules
 *
 * Rules for keeping inbox clean through automated organization:
 * - Newsletter cleanup with age-based deletion
 * - Cold outreach filtering with draft automation
 * - CC organization
 * - Receipt labeling
 * - Social media noise reduction
 * - Stack Overflow digest cleanup
 */

import { DefaultRule } from './types.js';

export const EMAIL_ORG_RULES: DefaultRule[] = [
  // Rule 1: Newsletter Sweeper
  {
    id: 'universal-newsletters',
    category: 'email_organization',
    name: '📚 Newsletter Sweeper',
    intent: 'Remove low-value newsletters/news updates from inbox after short retention',
    description: 'Deletes newsletters and news digests older than 7 days to keep inbox clean',
    condition: {
      and: [
        {
          or: [
            { category: 'newsletter' },
            { category: 'news' }
          ]
        },
        { confidence_gt: 0.81 },
        { older_than_days: 7 }
      ]
    },
    actions: ['delete'],
    priority: 10,
    is_enabled_by_default: true
  },

  // Rule 2: Cold Outreach Filter
  {
    id: 'universal-cold-outreach',
    category: 'email_organization',
    name: '❄️ Cold Outreach Filter',
    intent: 'Route cold outreach and prepare a polite response draft',
    description: 'Labels cold outreach and generates polite decline/interest draft responses',
    condition: {
      and: [
        {
          or: [
            { category: 'promotional' },
            { category: 'client' }
          ]
        },
        { recipient_type: 'bcc' },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['label:Sales/Cold Outreach', 'draft'],
    instructions: 'Politely acknowledge the outreach. If not interested, thank them and decline. If potentially interested, ask for more details.',
    priority: 20,
    is_enabled_by_default: true
  },

  // Rule 3: CC Organizer
  {
    id: 'universal-cc-organizer',
    category: 'email_organization',
    name: '👀 CC Organizer',
    intent: 'Label CC traffic for quick triage',
    description: 'Labels emails where you are CC\'d for easier filtering and batch review',
    condition: {
      recipient_type: 'cc'
    },
    actions: ['label:CC'],
    priority: 5,
    is_enabled_by_default: true
  },

  // Rule 4: Receipt Organizer
  {
    id: 'universal-receipts',
    category: 'email_organization',
    name: '🧾 Receipt Organizer',
    intent: 'Preserve receipts for tracing, audit, and tax filing',
    description: 'Labels transactional emails (receipts, invoices) for easy searching and tax filing',
    condition: {
      and: [
        { category: 'transactional' },
        { confidence_gt: 0.90 },
        { contains_keywords: ['receipt', 'invoice', 'payment', 'order confirmation', 'purchase'] }
      ]
    },
    actions: ['label:Receipts'],
    priority: 15,
    is_enabled_by_default: true
  },

  // Rule 8: Social Noise
  {
    id: 'exec-social',
    category: 'email_organization',
    name: '🔔 Social Noise',
    intent: 'Reduce social updates that do not require action',
    description: 'Deletes social media notifications older than 7 days (LinkedIn, Twitter, etc.)',
    condition: {
      and: [
        { category: 'social' },
        { confidence_gt: 0.81 },
        { older_than_days: 7 }
      ]
    },
    actions: ['delete'],
    priority: 5,
    is_enabled_by_default: true
  },

  // Rule 16: Stack Overflow Digests
  {
    id: 'dev-stack-overflow',
    category: 'email_organization',
    name: '💻 Stack Overflow Digests',
    intent: 'Remove stale Stack Overflow digests from inbox',
    description: 'Deletes Stack Overflow digest emails older than 7 days',
    condition: {
      and: [
        {
          or: [
            { category: 'newsletter' },
            { category: 'news' }
          ]
        },
        { contains_keywords: ['stack overflow', 'stackoverflow'] },
        { older_than_days: 7 }
      ]
    },
    actions: ['delete'],
    priority: 5,
    is_enabled_by_default: false
  }
];
