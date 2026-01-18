-- Create atomic function to append actions to an email record without duplicates
CREATE OR REPLACE FUNCTION append_email_action(p_email_id UUID, p_action TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE emails 
    SET actions_taken = array_append(COALESCE(actions_taken, '{}'), p_action)
    WHERE id = p_email_id
    AND NOT (COALESCE(actions_taken, '{}') @> ARRAY[p_action]);
END;
$$;
