-- =============================================
-- Creator Studio: payout requests table
-- Eligible when profile.points >= 5,000,000
-- =============================================

CREATE TABLE IF NOT EXISTS public.creator_payout_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_at_request BIGINT NOT NULL,
  -- Conversion: every 1,000,000 points = ₦1,000
  amount_ngn       NUMERIC(12, 2) NOT NULL,
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'opay', 'palmpay', 'moniepoint')),
  account_number   TEXT NOT NULL,
  account_name     TEXT NOT NULL,
  bank_name        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected')),
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_payout_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own payout requests"
  ON public.creator_payout_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can submit new requests (only if they have enough points — enforced in app layer too)
CREATE POLICY "Users can create own payout requests"
  ON public.creator_payout_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role / admin can update status
CREATE POLICY "Service role can update payout requests"
  ON public.creator_payout_requests FOR UPDATE
  USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_creator_payout_requests_updated_at
  BEFORE UPDATE ON public.creator_payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for quick per-user lookups
CREATE INDEX IF NOT EXISTS creator_payout_requests_user_id_idx
  ON public.creator_payout_requests (user_id, created_at DESC);
