-- Migration: Add Draft Actions to High-Value Auto-Pilot Rules
-- Enhances rules with AI-powered draft replies and context-aware instructions

-- Add instructions column to rule_templates if it doesn't exist
ALTER TABLE public.rule_templates
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Add instructions column to rules table if it doesn't exist
ALTER TABLE public.rules
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- ============================================================================
-- SALES RULES - High Priority for Draft Actions
-- ============================================================================

-- 1. Hot Leads - Draft enthusiastic follow-ups
UPDATE public.rule_templates
SET
  actions = ARRAY['star', 'label:Leads/Hot', 'draft'],
  instructions = 'Draft an enthusiastic but professional response. Thank them for their interest and the specific points they mentioned. Suggest 2-3 concrete next steps (demo, call, pricing discussion). Match their level of formality. Keep it warm, concise, and action-oriented. End with a clear call-to-action and your availability.'
WHERE rule_id = 'sales-hot-leads';

-- 2. Objections & Concerns - Draft thoughtful responses
UPDATE public.rule_templates
SET
  actions = ARRAY['label:Objections', 'draft'],
  instructions = 'Draft an empathetic response that addresses their specific concerns. Acknowledge their hesitation as valid. Provide 1-2 concrete ways to address each concern they raised. Use social proof if relevant (e.g., "Many clients had similar concerns initially"). Keep tone reassuring but not pushy. Offer to discuss further on a call.'
WHERE rule_id = 'sales-objections';

-- 3. Follow-ups - Draft polite check-ins
UPDATE public.rule_templates
SET
  actions = ARRAY['label:Follow-ups', 'draft'],
  instructions = 'Draft a brief, friendly check-in. Reference your last interaction specifically. Ask if they need any additional information or if priorities have changed. Provide value (share a relevant resource, insight, or update). Keep it short (3-4 sentences max). No pressure - just staying helpful and top-of-mind.'
WHERE rule_id = 'sales-follow-ups';

-- 4. Referrals & Intros - Draft warm thank-you responses
UPDATE public.rule_templates
SET
  actions = ARRAY['star', 'label:Referrals', 'draft'],
  instructions = 'Draft a warm, grateful response. Thank both the introducer and the new contact. Reference the specific context of the introduction. Suggest a specific next step (coffee, call, demo). Show genuine interest in learning about their needs/challenges. Keep tone friendly and appreciative.'
WHERE rule_id = 'sales-referrals';

-- 5. Contracts & Proposals - Draft confirmation responses
UPDATE public.rule_templates
SET
  actions = ARRAY['star', 'label:Contracts', 'draft'],
  instructions = 'Draft a professional confirmation. Acknowledge receipt of the contract/proposal. Confirm you are reviewing it and provide a realistic timeline for response. Flag any immediate questions or clarifications needed. Maintain a positive, collaborative tone. Set clear expectations for next steps.'
WHERE rule_id = 'sales-contracts';

-- ============================================================================
-- OPERATIONS RULES
-- ============================================================================

-- 6. Internal Requests - Draft quick acknowledgments
UPDATE public.rule_templates
SET
  actions = ARRAY['label:Internal/Requests', 'draft'],
  instructions = 'Draft a helpful internal response. Confirm you saw their request and understand what they need. Provide a realistic timeline or immediate answer if you can. If you need more info, ask specific clarifying questions. Keep tone collaborative and helpful. Use their name and be specific about next steps.'
WHERE rule_id = 'ops-internal-requests';

-- ============================================================================
-- UNIVERSAL RULES
-- ============================================================================

-- 7. Cold Outreach - Draft polite decline/redirect
UPDATE public.rule_templates
SET
  actions = ARRAY['label:Sales/Cold Outreach', 'read', 'draft'],
  instructions = 'Draft a brief, polite decline. Thank them for reaching out. Be direct but kind - explain you are not the right fit or not interested at this time. If appropriate, suggest someone else in your network or a better point of contact. Keep it short (2-3 sentences). No need to over-explain.'
WHERE rule_id = 'universal-cold-outreach';

-- ============================================================================
-- EXECUTIVE RULES
-- ============================================================================

-- 8. Meeting Invites - Draft accept/decline with context
UPDATE public.rule_templates
SET
  actions = ARRAY['label:Meetings', 'read', 'draft'],
  instructions = 'Draft a meeting response. If accepting: confirm attendance and ask any needed clarification (agenda, dial-in, prep materials). If declining: apologize briefly, suggest an alternative time or delegate if appropriate. Keep it professional and concise. Include any scheduling preferences or constraints.'
WHERE rule_id = 'exec-meeting-invites';

-- ============================================================================
-- DEVELOPER RULES
-- ============================================================================

-- 9. Code Review Requests - Draft acknowledgment
UPDATE public.rule_templates
SET
  actions = ARRAY['label:GitHub/Review Requests', 'draft'],
  instructions = 'Draft a quick acknowledgment. Confirm you saw the review request and will review it. Provide a realistic ETA (e.g., "will review by end of day" or "will review tomorrow morning"). If you are swamped, be honest and suggest an alternative reviewer. Keep it brief and professional.'
WHERE rule_id = 'dev-code-review';

-- ============================================================================
-- Update existing user rules to inherit new actions/instructions
-- ============================================================================

-- Update user rules to get the new draft actions and instructions from templates
UPDATE public.rules r
SET
  actions = rt.actions,
  instructions = rt.instructions
FROM public.rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND r.is_system_managed = true
  AND rt.rule_id IN (
    'sales-hot-leads',
    'sales-objections',
    'sales-follow-ups',
    'sales-referrals',
    'sales-contracts',
    'ops-internal-requests',
    'universal-cold-outreach',
    'exec-meeting-invites',
    'dev-code-review'
  );

-- Add comments
COMMENT ON COLUMN public.rule_templates.instructions IS 'AI instructions for draft generation - provides context and tone guidance';
COMMENT ON COLUMN public.rules.instructions IS 'AI instructions for draft generation - provides context and tone guidance';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.rule_templates
  WHERE instructions IS NOT NULL;

  RAISE NOTICE 'Enhanced % rule templates with draft actions and instructions', updated_count;
END $$;
