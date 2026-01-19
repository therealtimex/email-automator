-- Pre-compiled Rule Context Optimization
-- Caches the AI-ready rule context string to avoid recomputation per email

-- Add column to store pre-compiled rule context
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS compiled_rule_context TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS rules_compiled_at TIMESTAMPTZ;

COMMENT ON COLUMN user_settings.compiled_rule_context IS 'Pre-compiled rule context string for AI matching, updated when rules change';
COMMENT ON COLUMN user_settings.rules_compiled_at IS 'Timestamp of last rule context compilation';

-- Create function to compile user rules into AI-ready context
CREATE OR REPLACE FUNCTION compile_user_rules(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_context TEXT := '';
    v_rule RECORD;
    v_rule_num INTEGER := 1;
    v_actions TEXT;
BEGIN
    -- Build context string from enabled rules ordered by priority
    FOR v_rule IN 
        SELECT id, name, description, intent, actions, action, instructions, priority
        FROM rules 
        WHERE user_id = p_user_id AND is_enabled = true
        ORDER BY COALESCE(priority, 0) DESC, created_at ASC
    LOOP
        -- Build actions string
        IF v_rule.actions IS NOT NULL AND array_length(v_rule.actions, 1) > 0 THEN
            v_actions := array_to_string(v_rule.actions, ', ');
        ELSIF v_rule.action IS NOT NULL THEN
            v_actions := v_rule.action;
        ELSE
            v_actions := 'none';
        END IF;
        
        -- Append rule to context
        v_context := v_context || 'Rule ' || v_rule_num || ' [ID: ' || v_rule.id || ']' || E'\n';
        v_context := v_context || '  Name: ' || COALESCE(v_rule.name, 'Unnamed') || E'\n';
        
        IF v_rule.description IS NOT NULL AND v_rule.description != '' THEN
            v_context := v_context || '  Description: ' || v_rule.description || E'\n';
        END IF;
        
        IF v_rule.intent IS NOT NULL AND v_rule.intent != '' THEN
            v_context := v_context || '  Intent: ' || v_rule.intent || E'\n';
        END IF;
        
        v_context := v_context || '  Actions: ' || v_actions || E'\n';
        
        IF v_rule.instructions IS NOT NULL AND v_rule.instructions != '' THEN
            v_context := v_context || '  Draft Instructions: ' || v_rule.instructions || E'\n';
        END IF;
        
        v_context := v_context || E'\n';
        v_rule_num := v_rule_num + 1;
    END LOOP;
    
    -- Update the cached context
    UPDATE user_settings 
    SET compiled_rule_context = v_context,
        rules_compiled_at = NOW()
    WHERE user_id = p_user_id;
    
    -- If no settings row exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_settings (user_id, compiled_rule_context, rules_compiled_at)
        VALUES (p_user_id, v_context, NOW())
        ON CONFLICT (user_id) DO UPDATE 
        SET compiled_rule_context = EXCLUDED.compiled_rule_context,
            rules_compiled_at = EXCLUDED.rules_compiled_at;
    END IF;
    
    RETURN v_context;
END;
$$;

-- Create trigger function to auto-recompile on rule changes
CREATE OR REPLACE FUNCTION trigger_recompile_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Get the user_id from either NEW or OLD record
    IF TG_OP = 'DELETE' THEN
        PERFORM compile_user_rules(OLD.user_id);
    ELSE
        PERFORM compile_user_rules(NEW.user_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on rules table
DROP TRIGGER IF EXISTS rules_compile_insert ON rules;
DROP TRIGGER IF EXISTS rules_compile_update ON rules;
DROP TRIGGER IF EXISTS rules_compile_delete ON rules;

CREATE TRIGGER rules_compile_insert
    AFTER INSERT ON rules
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recompile_rules();

CREATE TRIGGER rules_compile_update
    AFTER UPDATE ON rules
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recompile_rules();

CREATE TRIGGER rules_compile_delete
    AFTER DELETE ON rules
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recompile_rules();

-- Compile existing rules for all users
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    FOR v_user_id IN SELECT DISTINCT user_id FROM rules
    LOOP
        PERFORM compile_user_rules(v_user_id);
    END LOOP;
END;
$$;
