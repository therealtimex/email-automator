/**
 * Development Rules
 *
 * Rules for software engineers and technical teams:
 * - GitHub mentions and assignments
 * - CI/CD failure alerts
 * - Dependabot cleanup
 * - Code review tracking with draft automation
 * - Monitoring alert cleanup
 * - Weekly reports cleanup
 */

import { DefaultRule } from './types.js';

export const DEVELOPMENT_RULES: DefaultRule[] = [
  // Rule 11: GitHub Mentions
  {
    id: 'dev-github-mentions',
    category: 'development',
    name: '👤 GitHub Mentions',
    intent: 'Keep mention and assignment notifications discoverable',
    description: 'Labels GitHub mentions and assignments for tracking',
    condition: {
      and: [
        {
          or: [
            { category: 'notification' },
            { category: 'internal' }
          ]
        },
        { contains_keywords: ['@', 'mentioned you', 'assigned you', 'requested your review'] },
        {
          or: [
            { sender_domain: 'github.com' },
            { sender_domain: 'gitlab.com' }
          ]
        }
      ]
    },
    actions: ['label:GitHub/Mentions'],
    priority: 80,
    is_enabled_by_default: true
  },

  // Rule 12: CI/CD Failures
  {
    id: 'dev-ci-failures',
    category: 'development',
    name: '❌ CI/CD Failures',
    intent: 'Escalate build/deploy failures for faster recovery',
    description: 'Stars CI/CD failure notifications for immediate attention',
    condition: {
      and: [
        { category: 'notification' },
        { contains_keywords: ['failed', 'failure', 'error', 'broken', 'build failed'] },
        {
          or: [
            { sender_domain: 'circleci.com' },
            { sender_domain: 'github.com' },
            { sender_domain: 'gitlab.com' },
            { sender_domain: 'travis-ci.com' }
          ]
        }
      ]
    },
    actions: ['star', 'label:CI/Failures'],
    priority: 90,
    is_enabled_by_default: true
  },

  // Rule 13: Dependabot Noise
  {
    id: 'dev-dependabot',
    category: 'development',
    name: '🤖 Dependabot Noise',
    intent: 'Reduce low-priority dependency update noise',
    description: 'Deletes non-security Dependabot notifications older than 14 days',
    condition: {
      and: [
        {
          or: [
            { category: 'notification' },
            { category: 'newsletter' }
          ]
        },
        { contains_keywords: ['dependabot', 'dependency', 'package update'] },
        {
          not: { contains_keywords: ['security', 'vulnerability', 'CVE'] }
        },
        { older_than_days: 14 }
      ]
    },
    actions: ['delete'],
    priority: 15,
    is_enabled_by_default: true
  },

  // Rule 14: Code Review Requests
  {
    id: 'dev-code-review',
    category: 'development',
    name: '👀 Code Review Requests',
    intent: 'Track review requests and draft quick acknowledgments',
    description: 'Labels code review requests and drafts acknowledgment',
    condition: {
      and: [
        {
          or: [
            { category: 'internal' },
            { category: 'notification' }
          ]
        },
        { contains_keywords: ['review requested', 'pull request', 'merge request', 'PR'] },
        { confidence_gt: 0.70 }
      ]
    },
    actions: ['label:GitHub/Review Requests', 'draft'],
    instructions: 'Acknowledge review request. Provide estimated review timeline. Ask for context if needed.',
    priority: 80,
    is_enabled_by_default: true
  },

  // Rule 15: Monitoring Alerts
  {
    id: 'dev-monitoring',
    category: 'development',
    name: '⚠️ Monitoring Alerts',
    intent: 'Tidy non-urgent monitoring alerts while keeping labels',
    description: 'Labels and deletes non-urgent monitoring alerts older than 14 days',
    condition: {
      and: [
        {
          or: [
            { category: 'notification' },
            { category: 'support' }
          ]
        },
        {
          not: { contains_keywords: ['critical', 'urgent', 'down', 'outage'] }
        },
        {
          or: [
            { sender_domain: 'datadog.com' },
            { sender_domain: 'pingdom.com' },
            { sender_domain: 'sentry.io' }
          ]
        },
        { older_than_days: 14 }
      ]
    },
    actions: ['label:Monitoring', 'delete'],
    priority: 20,
    is_enabled_by_default: true
  },

  // Rule 7: Weekly Reports
  {
    id: 'exec-reports',
    category: 'development',
    name: '📊 Weekly Reports',
    intent: 'Keep reports structured and remove stale report traffic',
    description: 'Labels reports and deletes them after 30 days',
    condition: {
      and: [
        {
          or: [
            { category: 'internal' },
            { category: 'client' }
          ]
        },
        { contains_keywords: ['weekly report', 'status report', 'metrics', 'dashboard'] },
        { older_than_days: 30 }
      ]
    },
    actions: ['label:Reports', 'delete'],
    priority: 10,
    is_enabled_by_default: false
  }
];
