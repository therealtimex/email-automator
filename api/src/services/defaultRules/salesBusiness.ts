/**
 * Sales & Business Rules
 *
 * Rules for sales, business development, and customer-facing teams:
 * - Financial communication tracking with draft automation
 * - Hot lead prioritization with draft automation
 * - Follow-up tracking with draft automation
 * - Referral management with draft automation
 * - Contract tracking with draft automation
 * - Objection handling with draft automation
 * - Nurture campaign cleanup
 */

import { DefaultRule } from './types.js';

export const SALES_BUSINESS_RULES: DefaultRule[] = [
  // Rule 9: Financial Updates
  {
    id: 'exec-financial',
    category: 'sales_business',
    name: '💰 Financial Updates',
    intent: 'Prioritize financial communication and draft professional responses',
    description: 'Stars financial emails and drafts professional acknowledgment',
    condition: {
      and: [
        {
          or: [
            { category: 'client' },
            { category: 'internal' },
            { category: 'transactional' }
          ]
        },
        { contains_keywords: ['invoice', 'payment', 'contract', 'budget', 'financial', 'pricing', 'quote'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['star', 'label:Financial', 'draft'],
    instructions: 'Acknowledge receipt of financial communication. Confirm details if needed. Provide next steps.',
    priority: 95,
    is_enabled_by_default: true
  },

  // Rule 17: Hot Leads
  {
    id: 'sales-hot-leads',
    category: 'sales_business',
    name: '🔥 Hot Leads',
    intent: 'Prioritize high-intent leads and draft next-step replies',
    description: 'Stars high-intent leads and drafts next-step response',
    condition: {
      and: [
        { category: 'client' },
        { contains_keywords: ['interested', 'demo', 'pricing', 'get started', 'sign up', 'ready to'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['star', 'label:Leads/Hot', 'draft'],
    instructions: 'Express enthusiasm about their interest. Suggest specific next steps (demo, call, trial). Provide calendar link if applicable.',
    priority: 95,
    is_enabled_by_default: true
  },

  // Rule 18: Follow-up Reminders
  {
    id: 'sales-follow-ups',
    category: 'sales_business',
    name: '🔄 Follow-up Reminders',
    intent: 'Draft courteous follow-ups to keep opportunities moving',
    description: 'Labels and drafts polite follow-up responses',
    condition: {
      and: [
        {
          or: [
            { category: 'client' },
            { category: 'personal' }
          ]
        },
        { contains_keywords: ['follow up', 'checking in', 'touching base', 'any update'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['label:Follow-ups', 'draft'],
    instructions: 'Acknowledge their follow-up. Provide status update. Suggest next steps or timeline.',
    priority: 75,
    is_enabled_by_default: true
  },

  // Rule 19: Referrals & Intros
  {
    id: 'sales-referrals',
    category: 'sales_business',
    name: '🤝 Referrals & Intros',
    intent: 'Capture warm intros and draft appreciative responses',
    description: 'Stars referrals and drafts appreciative response',
    condition: {
      and: [
        {
          or: [
            { category: 'client' },
            { category: 'personal' }
          ]
        },
        { contains_keywords: ['introduction', 'intro', 'referred', 'referral', 'connect you with'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['star', 'label:Referrals', 'draft'],
    instructions: 'Thank them for the introduction. Express interest in connecting. Suggest specific time or next steps.',
    priority: 90,
    is_enabled_by_default: true
  },

  // Rule 20: Contracts & Proposals
  {
    id: 'sales-contracts',
    category: 'sales_business',
    name: '📄 Contracts & Proposals',
    intent: 'Escalate contract traffic and draft confirmation responses',
    description: 'Stars contracts and drafts confirmation response',
    condition: {
      and: [
        {
          or: [
            { category: 'client' },
            { category: 'transactional' }
          ]
        },
        { contains_keywords: ['contract', 'proposal', 'agreement', 'signature', 'docusign', 'sign'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['star', 'label:Contracts', 'draft'],
    instructions: 'Acknowledge receipt of contract/proposal. Confirm review timeline. Ask clarifying questions if needed.',
    priority: 95,
    is_enabled_by_default: true
  },

  // Rule 21: Objections & Concerns
  {
    id: 'sales-objections',
    category: 'sales_business',
    name: '🤔 Objections & Concerns',
    intent: 'Draft empathetic responses to objections and hesitations',
    description: 'Labels objections and drafts empathetic response',
    condition: {
      and: [
        { category: 'client' },
        { contains_keywords: ['concern', 'worried', 'hesitant', 'not sure', 'expensive', 'too costly'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['label:Objections', 'draft'],
    instructions: 'Acknowledge their concern empathetically. Address the specific objection. Offer alternatives or clarification.',
    priority: 85,
    is_enabled_by_default: true
  },

  // Rule 22: Nurture Campaigns
  {
    id: 'sales-nurture',
    category: 'sales_business',
    name: '📧 Nurture Campaigns',
    intent: 'Clear low-value campaign email automatically after retention',
    description: 'Deletes nurture campaign emails older than 7 days',
    condition: {
      and: [
        {
          or: [
            { category: 'promotional' },
            { category: 'newsletter' }
          ]
        },
        { contains_keywords: ['campaign', 'unsubscribe', 'marketing'] },
        { older_than_days: 7 }
      ]
    },
    actions: ['delete'],
    priority: 10,
    is_enabled_by_default: false
  }
];
