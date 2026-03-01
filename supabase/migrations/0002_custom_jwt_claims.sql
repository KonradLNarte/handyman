-- Custom JWT claims function that injects tenant_id from app_metadata into JWT.
-- This is called by Supabase Auth to augment the JWT token.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  tenant_id text;
BEGIN
  claims := event->'claims';

  -- Extract tenant_id from app_metadata
  tenant_id := (event->'claims'->'app_metadata'->>'tenant_id');

  IF tenant_id IS NOT NULL THEN
    -- Set tenant_id as a top-level claim so RLS can read it
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(tenant_id));
  END IF;

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant usage to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
