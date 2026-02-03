/**
 * Priority Alert Rules
 *
 * Rules for highlighting important and urgent communications:
 * - VIP client/customer prioritization
 * - Direct questions requiring responses
 * - Legal documents and contracts
 * - Travel itineraries
 */

import { DefaultRule } from './types.js';

export const PRIORITY_RULES: DefaultRule[] = [
  {
    id: 'vip-clients-prioritizer',
    category: 'priority_alerts',
    name: '⭐ VIP Client Prioritizer',
    intent: 'Star and prioritize emails from key clients and partners',
    description: 'Automatically highlights emails from VIP contacts and important clients',
    condition: {
      or: [
        {
          sender_is_vip: true  // From VIP list (requires VIP management feature)
        },
        {
          category: 'client',
          ai_priority: 'High'
        }
      ]
    },
    actions: ['star', 'important'],
    priority: 100,
    is_enabled_by_default: true
  },
  {
    id: 'direct-questions-highlighter',
    category: 'priority_alerts',
    name: '⚡ Direct Questions Highlighter',
    intent: 'Highlight emails that require your direct input',
    description: 'Identifies emails where you\'re the only recipient and a response is clearly needed',
    condition: {
      recipient_type: 'to',
      recipient_count_gt: 0,  // Only sent to you
      contains_keywords: ['?', 'your input', 'your thoughts', 'need your', 'awaiting your', 'question', 'wondering', 'can you', 'could you'],
      not: {
        category: 'newsletter'  // Exclude automated newsletters
      }
    },
    actions: ['important'],
    priority: 90,
    is_enabled_by_default: true
  },
  {
    id: 'travel-itineraries-organizer',
    category: 'priority_alerts',
    name: '✈️ Travel Organizer',
    intent: 'Organize flight confirmations, hotel bookings, and itineraries',
    description: 'Labels travel-related emails for easy access before trips',
    condition: {
      or: [
        {
          sender_domain: 'delta.com'
        },
        {
          sender_domain: 'united.com'
        },
        {
          sender_domain: 'aa.com'
        },
        {
          sender_domain: 'hilton.com'
        },
        {
          sender_domain: 'marriott.com'
        },
        {
          sender_domain: 'airbnb.com'
        },
        {
          contains_keywords: ['itinerary', 'flight confirmation', 'booking confirmation', 'reservation confirmed']
        }
      ]
    },
    actions: ['label:Travel', 'star'],
    priority: 70,
    is_enabled_by_default: true
  },
  {
    id: 'legal-contracts-highlighter',
    category: 'priority_alerts',
    name: '⚖️ Legal & Contracts Highlighter',
    intent: 'Highlight important legal documents and contracts',
    description: 'Stars emails containing contracts, NDAs, and legal documents requiring signature',
    condition: {
      or: [
        {
          sender_domain: 'docusign.com'
        },
        {
          sender_domain: 'hellosign.com'
        },
        {
          sender_domain: 'pandadoc.com'
        },
        {
          contains_keywords: ['nda', 'agreement', 'contract', 'sign', 'signature required', 'proposal', 'quote']
        }
      ]
    },
    actions: ['label:Legal', 'star'],
    priority: 95,
    is_enabled_by_default: true
  }
];
