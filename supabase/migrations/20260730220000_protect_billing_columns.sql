-- Prevent authenticated users from self-granting Pro / rewriting Stripe fields.
-- Uses single-quoted function body (no $...$ delimiters) for Supabase SQL Editor paste safety.

CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS '
BEGIN
  IF auth.role() = ''service_role''
     OR current_user IN (''postgres'', ''supabase_admin'') THEN
    RETURN NEW;
  END IF;

  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.subscription_status := OLD.subscription_status;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.current_period_end := OLD.current_period_end;

  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS protect_profile_billing_columns ON public.profiles;

CREATE TRIGGER protect_profile_billing_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_billing_columns();
