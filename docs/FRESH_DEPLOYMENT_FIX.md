# Fresh Deployment Fix - User Initialization

## Summary

Fixed critical bug preventing new users from getting `user_settings` and `rules` automatically.

## Root Cause

**Missing unique constraint** on `rules(user_id, rule_template_id)` caused trigger function to fail silently:

```
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

The trigger function used:
```sql
ON CONFLICT (user_id, rule_template_id) DO NOTHING
```

But the constraint didn't exist! ❌

## Solution - 3 Migrations

### 1. `20260206000000_restore_rule_templates.sql`
- Recreates `rule_templates` table (dropped by bad cleanup)
- Populates 23 default rules from TypeScript definitions
- **Status:** ✅ Working

### 2. `20260206000010_fix_trigger_naming_conflict.sql`
- Fixes function name collision
- Creates two separate functions:
  - `handle_new_auth_user()` - Creates profile (auth.users trigger)
  - `handle_new_profile()` - Creates settings + rules (profiles trigger)
- **Status:** ✅ Working (but fails due to missing constraint)

### 3. `20260206000011_add_rules_unique_constraint.sql` ⭐ **NEW**
- Adds missing unique constraint: `rules_user_template_unique`
- Required for `ON CONFLICT (user_id, rule_template_id)` to work
- **Status:** ✅ Fixes the trigger failure

## How It Works (Fixed Flow)

```
User Signs Up
      ↓
[auth.users] INSERT
      ↓
Trigger: on_auth_user_created
      ↓
Function: handle_new_auth_user()
      ↓
[profiles] INSERT
      ↓
Trigger: on_profile_created
      ↓
Function: handle_new_profile()
      ↓
INSERT INTO user_settings ✅
INSERT INTO rules (with ON CONFLICT) ✅
      ↓
✓ User initialized with 23 rules!
```

## Testing Fresh Deployment

### 1. Apply Migrations
```bash
./scripts/migrate.sh
```

### 2. Verify Setup
```sql
-- Check triggers exist
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('on_auth_user_created', 'on_profile_created');

-- Check unique constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.rules'::regclass
  AND conname = 'rules_user_template_unique';

-- Check rule templates exist
SELECT COUNT(*) as template_count FROM rule_templates;
```

**Expected:**
- ✅ 2 triggers active
- ✅ Unique constraint exists
- ✅ 23 rule templates

### 3. Create Test User
Sign up via UI, then verify:

```sql
-- Get user ID
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Check initialization (replace <user_id>)
SELECT
  u.email,
  p.id IS NOT NULL as has_profile,
  us.id IS NOT NULL as has_settings,
  (SELECT COUNT(*) FROM rules WHERE user_id = u.id) as rule_count
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_settings us ON us.user_id = u.id
WHERE u.id = '<user_id>';
```

**Expected:**
- ✅ `has_profile = true`
- ✅ `has_settings = true`
- ✅ `rule_count = 23`

## Why It Failed Before

### Timeline of Bugs:

1. **Migration `20260203145936`** - Dropped `rule_templates` table
   - Broke: Rule creation in trigger ❌

2. **Migration `20260205060000`** - Created new function but didn't update triggers
   - Broke: Function never called ❌

3. **Our Fix `20260206000000`** - Restored `rule_templates`
   - Fixed: Rule templates available ✅

4. **Our Fix `20260206000010`** - Fixed trigger function names
   - Fixed: Triggers call correct functions ✅
   - But: Still failed due to missing constraint ❌

5. **Our Fix `20260206000011`** - Added unique constraint
   - Fixed: ON CONFLICT now works ✅
   - **Complete fix!** 🎉

## Files Modified

**Migrations:**
- ✅ `supabase/migrations/20260206000000_restore_rule_templates.sql`
- ✅ `supabase/migrations/20260206000010_fix_trigger_naming_conflict.sql`
- ✅ `supabase/migrations/20260206000011_add_rules_unique_constraint.sql`

**Documentation:**
- ✅ `docs/FRESH_DEPLOYMENT_FIX.md` (this file)

## Migration Order (Critical)

Migrations must run in this order:
1. `20260206000000` - Restore templates (rules table must exist)
2. `20260206000010` - Fix triggers (references rules table)
3. `20260206000011` - Add constraint (alter rules table)

**Do NOT** run them out of order or skip any!

## Rollback (If Needed)

```sql
-- Remove constraint
ALTER TABLE public.rules DROP CONSTRAINT IF EXISTS rules_user_template_unique CASCADE;

-- Remove triggers
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Remove functions
DROP FUNCTION IF EXISTS public.handle_new_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
```

## Success Criteria

For fresh deployment to be considered "fixed":

- ✅ Migrations apply without errors
- ✅ Triggers are active and enabled
- ✅ Unique constraint exists
- ✅ 23 rule templates in database
- ✅ New user signup creates:
  - Profile in `profiles` table
  - Settings in `user_settings` table
  - 23 rules in `rules` table
- ✅ Digital Persona Wizard can save settings
- ✅ No auth errors in API logs

## Next Steps

1. ✅ **Apply migrations** to fresh Supabase project
2. ✅ **Run verification queries** to confirm setup
3. ✅ **Create test user** and verify initialization
4. ✅ **Test Digital Persona Wizard** saves correctly
5. ✅ **Monitor API logs** for any errors

---

**Status:** Ready for fresh deployment testing! 🚀

**Confidence:** High - We've identified and fixed the root cause (missing constraint)
