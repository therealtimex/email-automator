/**
 * Priority Alert Rules
 *
 * Rules for highlighting important and urgent communications:
 * - VIP urgent messages with draft automation
 * - Critical system alerts
 * - Urgent support tickets with draft automation
 */

import { DefaultRule } from './types.js';

export const PRIORITY_RULES: DefaultRule[] = [
  // Rule 5: VIP Urgent Messages
  {
    id: 'exec-urgent-vip',
    category: 'priority_alerts',
    name: '⭐ VIP Urgent Messages',
    intent: 'Surface high-priority VIP threads and suggest immediate response',
    description: 'Stars VIP messages, labels them, and generates immediate response draft',
    condition: {
      and: [
        {
          or: [
            { category: 'client' },
            { category: 'internal' }
          ]
        },
        { ai_priority: 'High' },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['star', 'label:VIP', 'draft'],
    instructions: 'Acknowledge receipt and priority. Express willingness to address immediately. Ask for clarification if needed.',
    priority: 100,
    is_enabled_by_default: true
  },

  // Rule 10: Critical Alerts
  {
    id: 'dev-critical-alerts',
    category: 'priority_alerts',
    name: '🚨 Critical Alerts',
    intent: 'Highlight production-impacting incidents immediately',
    description: 'Stars critical system alerts from monitoring/alerting tools',
    condition: {
      and: [
        {
          or: [
            { category: 'notification' },
            { category: 'support' }
          ]
        },
        { contains_keywords: ['critical', 'down', 'outage', 'incident', 'urgent', 'emergency'] },
        { confidence_gt: 0.85 }
      ]
    },
    actions: ['star', 'label:Alerts/Critical'],
    priority: 100,
    is_enabled_by_default: true
  },

  // Rule 23: Urgent Support Tickets
  {
    id: 'ops-urgent-tickets',
    category: 'priority_alerts',
    name: '🎫 Urgent Support Tickets',
    intent: 'Escalate urgent customer support threads and draft first response',
    description: 'Stars urgent support tickets and drafts acknowledgment response',
    condition: {
      and: [
        {
          or: [
            { category: 'support' },
            { category: 'client' }
          ]
        },
        { contains_keywords: ['urgent', 'emergency', 'critical', 'asap', 'escalate'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['star', 'label:Support/Urgent', 'draft'],
    instructions: 'Acknowledge ticket receipt and urgency. Confirm we are investigating. Provide initial timeline if possible.',
    priority: 100,
    is_enabled_by_default: true
  }
];
