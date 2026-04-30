-- =============================================
-- Referral System
-- 1 successful referral = 1,000 points
-- =============================================

-- Add referral columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Auto-generate referral code on profile insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(NEW.user_id::text || clock_timestamp()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing profiles that have no code
UPDATE public.profiles
SET referral_code = upper(substr(md5(user_id::text || clock_timestamp()::text || random()::text), 1, 8))
WHERE referral_code IS NULL;

-- Referrals tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_awarded BIGINT NOT NULL DEFAULT 1000,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_id)   -- each person can only be referred once
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- SECURITY DEFINER function so app layer can call it without direct table access
CREATE OR REPLACE FUNCTION public.handle_referral(p_referral_code TEXT, p_new_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Look up owner of this referral code
  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = upper(trim(p_referral_code));

  -- Bail if code invalid or self-referral
  IF v_referrer_id IS NULL OR v_referrer_id = p_new_user_id THEN
    RETURN;
  END IF;

  -- Insert referral record (ignore if already exists)
  INSERT INTO public.referrals (referrer_id, referred_id)
  VALUES (v_referrer_id, p_new_user_id)
  ON CONFLICT (referred_id) DO NOTHING;

  -- Award 1,000 points to referrer only if insert succeeded
  IF FOUND THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + 1000
    WHERE user_id = v_referrer_id;

    -- Tag the new user with who referred them
    UPDATE public.profiles
    SET referred_by = v_referrer_id
    WHERE user_id = p_new_user_id;
  END IF;
END;
$$;

-- Index for fast referral lookups
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals (referrer_id, created_at DESC);
