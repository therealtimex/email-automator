/**
 * Sales Pack - Revenue & Customer Communications
 *
 * Designed for sales, business development, and customer-facing teams who need to:
 * - Prioritize leads and customer communications
 * - Track CRM notifications
 * - Manage travel for client meetings
 * - Focus on revenue-generating activities
 */

import { RulePack } from './types.js';

export const SALES_PACK: RulePack = {
  id: 'sales',
  name: 'Sales Pack',
  description: 'Prioritize leads and customer communications',
  icon: '💼',
  enabled_by_default: false,
  target_roles: ['sales'],
  rules: [
    {
      id: 'sales-vip-clients',
      name: '⭐ VIP Client Prioritizer',
      intent: 'Star and prioritize emails from key clients and prospects',
      description: 'Automatically highlights emails from VIP contacts and hot leads',
      condition: {
        or: [
          {
            sender_is_vip: true  // From VIP list
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
      id: 'sales-direct-questions',
      name: '⚡ Customer Questions Highlighter',
      intent: 'Highlight customer questions that need responses',
      description: 'Identifies emails from customers asking questions or requesting information',
      condition: {
        recipient_type: 'to',
        contains_keywords: ['?', 'question', 'wondering', 'can you', 'could you'],
        not: {
          category: 'newsletter'
        }
      },
      actions: ['important'],
      priority: 90,
      is_enabled_by_default: true
    },
    {
      id: 'sales-crm-notifications',
      name: '📊 CRM Notification Organizer',
      intent: 'Organize Salesforce, HubSpot, and CRM notifications',
      description: 'Archives CRM notifications unless they require direct action',
      condition: {
        or: [
          {
            sender_domain: 'salesforce.com',
            not: {
              contains_keywords: ['assigned to you', 'mentioned you', 'deal closed']
            }
          },
          {
            sender_domain: 'hubspot.com',
            not: {
              contains_keywords: ['new lead', 'hot lead', 'assigned']
            }
          },
          {
            sender_domain: 'pipedrive.com'
          }
        ]
      },
      actions: ['label:CRM', 'archive'],
      priority: 15,
      is_enabled_by_default: true
    },
    {
      id: 'sales-calendar-responses',
      name: '📅 Calendar Response Cleaner',
      intent: 'Clean up calendar accept/decline notifications',
      description: 'Deletes automatic calendar responses without custom messages',
      condition: {
        contains_keywords: ['accepted:', 'declined:', 'tentative:'],
        not: {
          recipient_type: 'to'
        }
      },
      actions: ['delete'],
      priority: 10,
      is_enabled_by_default: false  // Disabled by default - deletion is aggressive
    },
    {
      id: 'sales-travel-itineraries',
      name: '✈️ Travel Organizer',
      intent: 'Organize flight confirmations and hotel bookings',
      description: 'Labels travel-related emails for easy access before client meetings',
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
      actions: ['label:Travel'],
      priority: 70,
      is_enabled_by_default: true
    },
    {
      id: 'sales-proposals',
      name: '📄 Proposal & Contract Highlighter',
      intent: 'Highlight proposals and contracts',
      description: 'Stars emails containing proposals, quotes, and contracts',
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
            contains_keywords: ['proposal', 'quote', 'contract', 'agreement', 'signature required']
          }
        ]
      },
      actions: ['label:Contracts', 'star'],
      priority: 85,
      is_enabled_by_default: true
    }
  ]
};
