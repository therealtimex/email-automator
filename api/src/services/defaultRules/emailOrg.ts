/**
 * Email Organization Rules
 *
 * Rules for keeping inbox clean through automated organization:
 * - Newsletter management
 * - Cold outreach filtering
 * - CC/FYI organization
 * - Receipt labeling
 */

import { DefaultRule } from './types.js';

export const EMAIL_ORG_RULES: DefaultRule[] = [
  {
    id: 'newsletters-auto-archive',
    category: 'email_organization',
    name: '📚 Newsletter Sweeper',
    intent: 'Keep newsletters organized and out of main inbox',
    description: 'Automatically archives newsletters and mass-marketing emails so you can read them later without inbox clutter',
    condition: {
      category: 'newsletter',
      confidence_gt: 0.7
    },
    actions: ['archive'],
    priority: 10,
    is_enabled_by_default: true
  },
  {
    id: 'cold-outreach-filter',
    category: 'email_organization',
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
    id: 'cc-fyi-organizer',
    category: 'email_organization',
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
    id: 'receipts-organizer',
    category: 'email_organization',
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
  },
  {
    id: 'social-notifications-archiver',
    category: 'email_organization',
    name: '🔔 Social Media Archiver',
    intent: 'Archive social media notifications',
    description: 'Automatically archives LinkedIn, Twitter, and other social notifications',
    condition: {
      category: 'social',
      confidence_gt: 0.8
    },
    actions: ['archive'],
    priority: 5,
    is_enabled_by_default: true
  },
  {
    id: 'calendar-responses-cleaner',
    category: 'email_organization',
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
  },
  {
    id: 'drive-shares-organizer',
    category: 'email_organization',
    name: '📂 Drive Share Organizer',
    intent: 'Archive Google Drive/Docs share notifications',
    description: 'Archives notifications about shared documents (usually redundant)',
    condition: {
      sender_domain: 'google.com',
      contains_keywords: ['shared', 'document', 'commented on', 'mentioned you in']
    },
    actions: ['label:Drive', 'archive'],
    priority: 5,
    is_enabled_by_default: true
  },
  {
    id: 'meeting-recordings-archiver',
    category: 'email_organization',
    name: '📹 Meeting Recording Archiver',
    intent: 'Archive meeting recordings and transcripts',
    description: 'Automatically archives Zoom, Teams, and AI note-taker recordings',
    condition: {
      or: [
        {
          sender_domain: 'zoom.us',
          contains_keywords: ['recording', 'cloud recording']
        },
        {
          sender_domain: 'microsoft.com',
          contains_keywords: ['recording', 'teams recording']
        },
        {
          sender_domain: 'fireflies.ai'
        },
        {
          sender_domain: 'otter.ai'
        }
      ]
    },
    actions: ['label:Recordings', 'archive'],
    priority: 10,
    is_enabled_by_default: true
  }
];
