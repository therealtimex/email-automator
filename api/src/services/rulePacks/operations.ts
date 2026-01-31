/**
 * Operations Pack - Support & Customer Success
 *
 * Designed for operations, support, and customer success teams who need to:
 * - Organize customer support tickets
 * - Track internal announcements
 * - Monitor system health
 * - Manage receipts and expenses
 */

import { RulePack } from './types.js';

export const OPERATIONS_PACK: RulePack = {
  id: 'operations',
  name: 'Operations Pack',
  description: 'Organize tickets, internal communications, and operations',
  icon: '🛠️',
  enabled_by_default: false,
  target_roles: ['operations'],
  rules: [
    {
      id: 'ops-support-tickets',
      name: '🎫 Support Ticket Organizer',
      intent: 'Organize customer support tickets and cases',
      description: 'Labels support tickets from Zendesk, Intercom, and other support tools',
      condition: {
        or: [
          {
            sender_domain: 'zendesk.com'
          },
          {
            sender_domain: 'intercom.io'
          },
          {
            sender_domain: 'freshdesk.com'
          },
          {
            contains_keywords: ['ticket', 'case created', 'support request', 'customer inquiry']
          },
          {
            category: 'support',
            confidence_gt: 0.7
          }
        ]
      },
      actions: ['label:Support'],
      priority: 80,
      is_enabled_by_default: true
    },
    {
      id: 'ops-urgent-tickets',
      name: '🚨 Urgent Ticket Highlighter',
      intent: 'Highlight high-priority and urgent customer issues',
      description: 'Stars urgent support tickets that need immediate attention',
      condition: {
        category: 'support',
        or: [
          {
            contains_keywords: ['urgent', 'emergency', 'critical', 'down', 'not working']
          },
          {
            ai_priority: 'High'
          }
        ]
      },
      actions: ['star', 'important'],
      priority: 100,
      is_enabled_by_default: true
    },
    {
      id: 'ops-system-alerts',
      name: '⚠️ System Alerts Organizer',
      intent: 'Organize system monitoring and uptime alerts',
      description: 'Labels system alerts while starring critical incidents',
      condition: {
        or: [
          {
            sender_domain: 'pingdom.com'
          },
          {
            sender_domain: 'uptimerobot.com'
          },
          {
            sender_domain: 'statuspage.io'
          },
          {
            sender_domain: 'datadog.com'
          }
        ]
      },
      actions: ['label:Monitoring'],
      priority: 70,
      is_enabled_by_default: true
    },
    {
      id: 'ops-critical-alerts',
      name: '🔥 Critical Alert Highlighter',
      intent: 'Highlight critical system incidents',
      description: 'Stars critical alerts that indicate system downtime or major issues',
      condition: {
        or: [
          {
            sender_domain: 'pingdom.com',
            contains_keywords: ['down', 'offline']
          },
          {
            sender_domain: 'datadog.com',
            contains_keywords: ['critical', 'incident']
          }
        ]
      },
      actions: ['star', 'important', 'pin'],
      priority: 100,
      is_enabled_by_default: true
    },
    {
      id: 'ops-internal-announcements',
      name: '🏢 Internal Announcements',
      intent: 'Keep internal company announcements in inbox',
      description: 'Keeps HR, team, and company-wide announcements visible (doesn\'t archive)',
      condition: {
        or: [
          {
            category: 'internal',
            confidence_gt: 0.7
          },
          {
            sender_domain: 'company.com',  // This should be customizable
            contains_keywords: ['all-hands', 'team announcement', 'company update']
          }
        ]
      },
      actions: [],  // No actions - keep in inbox
      priority: 50,
      is_enabled_by_default: true
    },
    {
      id: 'ops-project-management',
      name: '🔨 Project Management Organizer',
      intent: 'Organize project management tool notifications',
      description: 'Archives project management notifications unless you\'re directly mentioned',
      condition: {
        or: [
          {
            sender_domain: 'atlassian.net',
            not: {
              contains_keywords: ['assigned to you', 'mentioned you']
            }
          },
          {
            sender_domain: 'asana.com',
            not: {
              contains_keywords: ['assigned to you']
            }
          },
          {
            sender_domain: 'trello.com'
          },
          {
            sender_domain: 'monday.com'
          }
        ]
      },
      actions: ['label:Tools', 'archive'],
      priority: 15,
      is_enabled_by_default: true
    },
    {
      id: 'ops-receipts-invoices',
      name: '🧾 Receipt & Invoice Labeler',
      intent: 'Label receipts and invoices for expense tracking',
      description: 'Labels transactional emails for easy expense reporting',
      condition: {
        category: 'transactional',
        contains_keywords: ['receipt', 'invoice', 'payment', 'order confirmation'],
        confidence_gt: 0.75
      },
      actions: ['label:Finance/Receipts'],
      priority: 60,
      is_enabled_by_default: true
    }
  ]
};
