/**
 * Operations Rules
 *
 * Rules for support, operations, and customer success teams:
 * - Support ticket organization
 * - System monitoring alerts
 * - Internal announcements
 */

import { DefaultRule } from './types.js';

export const OPERATIONS_RULES: DefaultRule[] = [
  {
    id: 'support-tickets-organizer',
    category: 'operations',
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
    id: 'urgent-tickets-highlighter',
    category: 'operations',
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
    id: 'system-monitoring-organizer',
    category: 'operations',
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
    id: 'critical-system-alerts-highlighter',
    category: 'operations',
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
    id: 'internal-announcements',
    category: 'operations',
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
  }
];
