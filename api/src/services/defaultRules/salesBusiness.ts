/**
 * Sales & Business Rules
 *
 * Rules for sales, business development, and customer-facing teams:
 * - CRM notification management
 * - Proposal and contract tracking
 */

import { DefaultRule } from './types.js';

export const SALES_BUSINESS_RULES: DefaultRule[] = [
  {
    id: 'crm-notifications-organizer',
    category: 'sales_business',
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
    id: 'proposals-contracts-highlighter',
    category: 'sales_business',
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
];
