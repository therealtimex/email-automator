/**
 * Development Rules
 *
 * Rules for software engineers and technical teams:
 * - System alert prioritization
 * - CI/CD and monitoring notifications
 * - Code review highlights
 * - Project management tool organization
 */

import { DefaultRule } from './types.js';

export const DEVELOPMENT_RULES: DefaultRule[] = [
  {
    id: 'system-alerts-prioritizer',
    category: 'development',
    name: '🚨 System Alerts Prioritizer',
    intent: 'Prioritize critical system alerts and incidents',
    description: 'Stars critical alerts from AWS, Datadog, Sentry, PagerDuty while archiving info-level notifications',
    condition: {
      or: [
        {
          sender_domain: 'aws.amazon.com',
          contains_keywords: ['critical', 'down', 'outage', 'incident']
        },
        {
          sender_domain: 'datadoghq.com',
          contains_keywords: ['alert', 'critical', 'error rate']
        },
        {
          sender_domain: 'sentry.io',
          contains_keywords: ['new issue', 'regression', 'error']
        },
        {
          sender_domain: 'pagerduty.com',
          contains_keywords: ['triggered', 'incident']
        }
      ]
    },
    actions: ['star', 'important', 'pin'],
    priority: 100,
    is_enabled_by_default: true
  },
  {
    id: 'system-info-organizer',
    category: 'development',
    name: '⚠️ System Info Organizer',
    intent: 'Archive non-critical system notifications',
    description: 'Archives info and warning level alerts from monitoring tools',
    condition: {
      or: [
        {
          sender_domain: 'aws.amazon.com',
          not: {
            contains_keywords: ['critical', 'down', 'outage']
          }
        },
        {
          sender_domain: 'datadoghq.com',
          contains_keywords: ['info', 'warning', 'recovered']
        },
        {
          sender_domain: 'circleci.com'
        },
        {
          sender_domain: 'github.com',
          contains_keywords: ['build', 'workflow']
        }
      ]
    },
    actions: ['label:Logs', 'archive'],
    priority: 20,
    is_enabled_by_default: true
  },
  {
    id: 'project-management-organizer',
    category: 'development',
    name: '🔨 Project Management Organizer',
    intent: 'Organize Jira, GitHub, and project management notifications',
    description: 'Archives project management notifications unless you\'re directly assigned',
    condition: {
      or: [
        {
          sender_domain: 'atlassian.net',
          not: {
            contains_keywords: ['assigned to you', 'mentioned you']
          }
        },
        {
          sender_domain: 'github.com',
          not: {
            contains_keywords: ['assigned', 'review requested', '@']
          }
        },
        {
          sender_domain: 'asana.com',
          not: {
            contains_keywords: ['assigned to you']
          }
        },
        {
          sender_domain: 'trello.com'
        },
        {
          sender_domain: 'monday.com'
        }
      ]
    },
    actions: ['label:Tools', 'archive'],
    priority: 15,
    is_enabled_by_default: true
  },
  {
    id: 'code-reviews-highlighter',
    category: 'development',
    name: '👀 Code Review Highlighter',
    intent: 'Highlight pull request reviews and assignments',
    description: 'Stars GitHub/GitLab notifications where your review is requested',
    condition: {
      or: [
        {
          sender_domain: 'github.com',
          contains_keywords: ['review requested', 'requested your review']
        },
        {
          sender_domain: 'gitlab.com',
          contains_keywords: ['review', 'merge request']
        }
      ]
    },
    actions: ['star'],
    priority: 80,
    is_enabled_by_default: true
  }
];
