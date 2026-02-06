/**
 * Operations Rules
 *
 * Rules for support, operations, and customer success teams:
 * - Meeting invites with draft automation
 * - Internal requests with draft automation
 * - Vendor communications with draft automation
 * - System alert cleanup
 */

import { DefaultRule } from './types.js';

export const OPERATIONS_RULES: DefaultRule[] = [
  // Rule 6: Meeting Invites
  {
    id: 'exec-meeting-invites',
    category: 'operations',
    name: '📅 Meeting Invites',
    intent: 'Organize meeting requests and draft accept/decline replies',
    description: 'Labels meeting invites and drafts accept/decline response',
    condition: {
      and: [
        {
          or: [
            { category: 'internal' },
            { category: 'client' },
            { category: 'personal' }
          ]
        },
        { contains_keywords: ['meeting', 'calendar invite', 'zoom', 'teams', 'google meet'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['label:Meetings', 'draft'],
    instructions: 'Confirm availability or suggest alternative times. Accept or politely decline with reason if needed.',
    priority: 80,
    is_enabled_by_default: true
  },

  // Rule 24: Internal Requests
  {
    id: 'ops-internal-requests',
    category: 'operations',
    name: '📥 Internal Requests',
    intent: 'Organize internal asks and draft acknowledgment replies',
    description: 'Labels internal requests and drafts acknowledgment',
    condition: {
      and: [
        { category: 'internal' },
        { contains_keywords: ['need', 'request', 'help', 'can you', 'could you', 'would you'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['label:Internal/Requests', 'draft'],
    instructions: 'Acknowledge the request. Confirm understanding. Provide timeline or next steps.',
    priority: 75,
    is_enabled_by_default: true
  },

  // Rule 25: Vendor Communications
  {
    id: 'ops-vendor-comms',
    category: 'operations',
    name: '🏢 Vendor Communications',
    intent: 'Track vendor operations traffic and draft response stubs',
    description: 'Labels vendor communications and drafts response',
    condition: {
      and: [
        {
          or: [
            { category: 'transactional' },
            { category: 'support' },
            { category: 'client' }
          ]
        },
        { contains_keywords: ['vendor', 'supplier', 'invoice', 'shipment', 'delivery', 'purchase order'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['label:Vendors', 'draft'],
    instructions: 'Acknowledge receipt. Confirm details or next steps. Ask questions if needed.',
    priority: 70,
    is_enabled_by_default: true
  },

  // Rule 26: System Alerts
  {
    id: 'ops-system-alerts',
    category: 'operations',
    name: '🔔 System Alerts',
    intent: 'Remove non-urgent system notifications after retention',
    description: 'Labels and deletes non-urgent system alerts older than 14 days',
    condition: {
      and: [
        { category: 'notification' },
        {
          not: { contains_keywords: ['critical', 'urgent', 'down'] }
        },
        { older_than_days: 14 }
      ]
    },
    actions: ['label:System Alerts', 'delete'],
    priority: 15,
    is_enabled_by_default: true
  }
];
