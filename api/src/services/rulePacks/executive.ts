/**
 * Executive Pack - Leadership & Strategic Communications
 *
 * Designed for executives, C-suite, and leadership who need to:
 * - Focus on VIP communications
 * - Prioritize strategic decisions
 * - Filter operational noise
 * - Manage travel and legal documents
 */

import { RulePack } from './types.js';

export const EXECUTIVE_PACK: RulePack = {
  id: 'executive',
  name: 'Executive Pack',
  description: 'Focus on high-priority communications and strategic matters',
  icon: '👔',
  enabled_by_default: false,
  target_roles: ['executive'],
  rules: [
    {
      id: 'exec-vip-clients',
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
      id: 'exec-direct-questions',
      name: '⚡ Direct Questions Highlighter',
      intent: 'Highlight emails that require your direct input',
      description: 'Identifies emails where you\'re the only recipient and a response is clearly needed',
      condition: {
        recipient_type: 'to',
        recipient_count_gt: 0,  // Only sent to you
        contains_keywords: ['?', 'your input', 'your thoughts', 'need your', 'awaiting your'],
        not: {
          category: 'newsletter'  // Exclude automated newsletters
        }
      },
      actions: ['important'],
      priority: 90,
      is_enabled_by_default: true
    },
    {
      id: 'exec-travel-itineraries',
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
            contains_keywords: ['itinerary', 'flight confirmation', 'booking confirmation', 'reservation confirmed']
          }
        ]
      },
      actions: ['label:Travel', 'star'],
      priority: 70,
      is_enabled_by_default: true
    },
    {
      id: 'exec-legal-contracts',
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
            contains_keywords: ['nda', 'agreement', 'contract', 'sign', 'signature required']
          }
        ]
      },
      actions: ['label:Legal', 'star'],
      priority: 95,
      is_enabled_by_default: true
    },
    {
      id: 'exec-social-notifications',
      name: '🔔 Social Media Archiver',
      intent: 'Archive social media notifications',
      description: 'Automatically archives LinkedIn, Twitter, and other social notifications',
      condition: {
        category: 'social',
        confidence_gt: 0.8
      },
      actions: ['archive', 'read'],
      priority: 5,
      is_enabled_by_default: true
    },
    {
      id: 'exec-calendar-responses',
      name: '📅 Calendar Response Cleaner',
      intent: 'Clean up calendar accept/decline notifications',
      description: 'Deletes automatic calendar responses that don\'t contain custom messages',
      condition: {
        contains_keywords: ['accepted:', 'declined:', 'tentative:'],
        not: {
          recipient_type: 'to'  // Don't delete if you're the only recipient
        }
      },
      actions: ['delete'],
      priority: 10,
      is_enabled_by_default: false  // Disabled by default - deletion is aggressive
    }
  ]
};
