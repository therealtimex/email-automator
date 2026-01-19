-- Fix: Include rule conditions in compiled context
-- The original compile_user_rules() function was missing the 'condition' field

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
    v_condition_text TEXT;
BEGIN
    -- Build context string from enabled rules ordered by priority
    FOR v_rule IN 
        SELECT id, name, description, intent, actions, action, instructions, priority, condition
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
        
        -- Build human-readable condition text
        v_condition_text := '';
        IF v_rule.condition IS NOT NULL THEN
            -- Extract condition details from JSONB
            IF v_rule.condition->>'field' IS NOT NULL THEN
                v_condition_text := 'When ' || (v_rule.condition->>'field');
                
                IF v_rule.condition->>'operator' = 'equals' THEN
                    v_condition_text := v_condition_text || ' equals "' || (v_rule.condition->>'value') || '"';
                ELSIF v_rule.condition->>'operator' = 'contains' THEN
                    v_condition_text := v_condition_text || ' contains "' || (v_rule.condition->>'value') || '"';
                ELSIF v_rule.condition->>'operator' = 'domain_equals' THEN
                    v_condition_text := v_condition_text || ' domain equals "' || (v_rule.condition->>'value') || '"';
                ELSE
                    v_condition_text := v_condition_text || ' ' || (v_rule.condition->>'operator') || ' "' || (v_rule.condition->>'value') || '"';
                END IF;
            END IF;
            
            -- Add boolean conditions
            IF (v_rule.condition->>'is_useless')::boolean = true THEN
                IF v_condition_text != '' THEN
                    v_condition_text := v_condition_text || ' AND ';
                ELSE
                    v_condition_text := 'When ';
                END IF;
                v_condition_text := v_condition_text || 'email is useless/low-value';
            END IF;
            
            -- Add AI priority condition
            IF v_rule.condition->>'ai_priority' IS NOT NULL THEN
                IF v_condition_text != '' THEN
                    v_condition_text := v_condition_text || ' AND ';
                ELSE
                    v_condition_text := 'When ';
                END IF;
                v_condition_text := v_condition_text || 'AI priority is "' || (v_rule.condition->>'ai_priority') || '"';
            END IF;
        END IF;
        
        -- Add retention/age condition
        IF v_rule.condition->>'older_than_days' IS NOT NULL THEN
            IF v_condition_text != '' THEN
                v_condition_text := v_condition_text || ' AND ';
            ELSE
                v_condition_text := 'When ';
            END IF;
            v_condition_text := v_condition_text || 'email is older than ' || (v_rule.condition->>'older_than_days') || ' days';
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
        
        -- CRITICAL: Include condition
        IF v_condition_text != '' THEN
            v_context := v_context || '  Condition: ' || v_condition_text || E'\n';
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

-- Recompile all existing rules with the new format
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
