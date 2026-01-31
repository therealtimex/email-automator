/**
 * Developer Pack - Engineering & Technical Workflows
 *
 * Designed for software engineers, DevOps, and technical teams who need to:
 * - Surface critical system alerts
 * - Filter project management noise
 * - Organize meeting recordings and docs
 * - Focus on code reviews and incidents
 */

import { RulePack } from './types.js';

export const DEVELOPER_PACK: RulePack = {
  id: 'developer',
  name: 'Developer Pack',
  description: 'Surface critical alerts and filter tool noise',
  icon: '💻',
  enabled_by_default: false,
  target_roles: ['developer'],
  rules: [
    {
      id: 'dev-system-alerts',
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
      id: 'dev-system-info',
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
      actions: ['label:Logs', 'archive', 'read'],
      priority: 20,
      is_enabled_by_default: true
    },
    {
      id: 'dev-project-management',
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
      id: 'dev-code-reviews',
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
    },
    {
      id: 'dev-meeting-recordings',
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
    },
    {
      id: 'dev-drive-shares',
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
    }
  ]
};
