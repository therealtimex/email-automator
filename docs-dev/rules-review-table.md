# Email Rules Review Table (Draft)

This table is a proposal for discussion.  
`delete` means move to Trash (recoverable for 30 days).

| # | Rule ID | Name | Rule Group | Intent | Target Categories | Proposed Actions | Apply When (Condition Summary) |
|---|---|---|---|---|---|---|---|
| 1 | universal-newsletters | Newsletter Sweeper | email_organization | Remove low-value newsletters/news updates from inbox after short retention | `["newsletter","news"]` | `["delete"]` | category in (`newsletter`,`news`) AND confidence >= 0.90 AND age >= 7d |
| 2 | universal-cold-outreach | Cold Outreach Filter | email_organization | Route cold outreach and prepare a polite response draft | `["promotional","client"]` | `["label:Sales/Cold Outreach","draft"]` | category in (`promotional`,`client`) AND recipient_type=`bcc` AND confidence >= 0.85 |
| 3 | universal-cc-organizer | CC Organizer | email_organization | Label CC traffic for quick triage | `["client","internal","personal","other"]` | `["label:CC"]` | recipient_type=`cc` |
| 4 | universal-receipts | Receipt Organizer | email_organization | Preserve receipts for tracing, audit, and tax filing | `["transactional"]` | `["label:Receipts"]` | category=`transactional` AND confidence >= 0.90 |
| 5 | exec-urgent-vip | VIP Urgent Messages | priority_alerts | Surface high-priority VIP threads and suggest immediate response | `["client","internal"]` | `["star","label:VIP","draft"]` | category in (`client`,`internal`) AND priority=`high` |
| 6 | exec-meeting-invites | Meeting Invites | operations | Organize meeting requests and draft accept/decline replies | `["internal","client","personal"]` | `["label:Meetings","draft"]` | category in (`internal`,`client`,`personal`) AND contains calendar invite |
| 7 | exec-reports | Weekly Reports | operations | Keep reports structured and remove stale report traffic | `["internal","client"]` | `["label:Reports","delete"]` | category in (`internal`,`client`) AND report keywords AND age >= 30d |
| 8 | exec-social | Social Noise | email_organization | Reduce social updates that do not require action | `["social"]` | `["delete"]` | category=`social` AND confidence >= 0.90 AND age >= 7d |
| 9 | exec-financial | Financial Updates | sales_business | Prioritize financial communication and draft professional responses | `["client","internal","transactional"]` | `["star","label:Financial","draft"]` | category in (`client`,`internal`,`transactional`) AND finance keywords |
| 10 | dev-critical-alerts | Critical Alerts | priority_alerts | Highlight production-impacting incidents immediately | `["notification","support"]` | `["star","label:Alerts/Critical"]` | category in (`notification`,`support`) AND urgent/incident keywords |
| 11 | dev-github-mentions | GitHub Mentions | development | Keep mention and assignment notifications discoverable | `["notification","internal"]` | `["label:GitHub/Mentions"]` | category in (`notification`,`internal`) AND mention/assignment keywords |
| 12 | dev-ci-failures | CI/CD Failures | development | Escalate build/deploy failures for faster recovery | `["notification"]` | `["star","label:CI/Failures"]` | category=`notification` AND CI failure keywords |
| 13 | dev-dependabot | Dependabot Noise | development | Reduce low-priority dependency update noise | `["notification","newsletter"]` | `["delete"]` | category in (`notification`,`newsletter`) AND dependabot keywords AND NOT security-critical AND age >= 14d |
| 14 | dev-code-review | Code Review Requests | development | Track review requests and draft quick acknowledgments | `["internal","notification"]` | `["label:GitHub/Review Requests","draft"]` | category in (`internal`,`notification`) AND review-request keywords |
| 15 | dev-monitoring | Monitoring Alerts | development | Tidy non-urgent monitoring alerts while keeping labels | `["notification","support"]` | `["label:Monitoring","delete"]` | category in (`notification`,`support`) AND non-urgent monitoring AND age >= 14d |
| 16 | dev-stack-overflow | Stack Overflow Digests | email_organization | Remove stale Stack Overflow digests from inbox | `["newsletter","news"]` | `["delete"]` | category in (`newsletter`,`news`) AND Stack Overflow digest keywords AND age >= 7d |
| 17 | sales-hot-leads | Hot Leads | sales_business | Prioritize high-intent leads and draft next-step replies | `["client"]` | `["star","label:Leads/Hot","draft"]` | category=`client` AND positive intent/high interest |
| 18 | sales-follow-ups | Follow-up Reminders | sales_business | Draft courteous follow-ups to keep opportunities moving | `["client","personal"]` | `["label:Follow-ups","draft"]` | category in (`client`,`personal`) AND follow-up/check-in keywords |
| 19 | sales-referrals | Referrals & Intros | sales_business | Capture warm intros and draft appreciative responses | `["client","personal"]` | `["star","label:Referrals","draft"]` | category in (`client`,`personal`) AND intro/referral keywords |
| 20 | sales-contracts | Contracts & Proposals | sales_business | Escalate contract traffic and draft confirmation responses | `["client","transactional"]` | `["star","label:Contracts","draft"]` | category in (`client`,`transactional`) AND contract/proposal keywords |
| 21 | sales-objections | Objections & Concerns | sales_business | Draft empathetic responses to objections and hesitations | `["client"]` | `["label:Objections","draft"]` | category=`client` AND concern/hesitation signals |
| 22 | sales-nurture | Nurture Campaigns | sales_business | Clear low-value campaign email automatically after retention | `["promotional","newsletter"]` | `["delete"]` | category in (`promotional`,`newsletter`) AND campaign keywords AND age >= 7d |
| 23 | ops-urgent-tickets | Urgent Support Tickets | priority_alerts | Escalate urgent customer support threads and draft first response | `["support","client"]` | `["star","label:Support/Urgent","draft"]` | category in (`support`,`client`) AND urgent/escalation signals |
| 24 | ops-internal-requests | Internal Requests | operations | Organize internal asks and draft acknowledgment replies | `["internal"]` | `["label:Internal/Requests","draft"]` | category=`internal` AND request/help keywords |
| 25 | ops-vendor-comms | Vendor Communications | operations | Track vendor operations traffic and draft response stubs | `["transactional","support","client"]` | `["label:Vendors","draft"]` | category in (`transactional`,`support`,`client`) AND vendor/invoice/shipment keywords |
| 26 | ops-system-alerts | System Alerts | operations | Remove non-urgent system notifications after retention | `["notification"]` | `["label:System Alerts","delete"]` | category=`notification` AND non-urgent AND age >= 14d |

## Notes

- Valid categories: `spam`, `newsletter`, `news`, `promotional`, `transactional`, `social`, `support`, `client`, `internal`, `personal`, `notification`, `other`.
- Suggested baseline thresholds:
  - delete rules: confidence >= 0.90
  - draft rules: confidence >= 0.75
- Recommended guardrails before delete:
  - skip VIP/allowlisted senders
  - skip messages with sensitive/legal/finance/security signals
  - skip messages with critical attachments unless explicitly allowed
