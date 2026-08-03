-- ============================================================
-- Follow/Friend System — run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id SERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read follows — needed for public follower/following counts
CREATE POLICY "Anyone can view follows"
  ON public.follows
  FOR SELECT
  USING (true);

-- Users may only create a follow row where they are the follower
CREATE POLICY "Users can follow as themselves"
  ON public.follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users may only delete their own follow rows
CREATE POLICY "Users can unfollow as themselves"
  ON public.follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Server-side rate limit: max 30 follows per minute per user.
-- Enforced in a trigger (not just RLS) because RLS alone can't count rows across a time window.
CREATE OR REPLACE FUNCTION public.enforce_follow_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.follows
  WHERE follower_id = NEW.follower_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 30 follows per minute';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS follows_rate_limit_trigger ON public.follows;
CREATE TRIGGER follows_rate_limit_trigger
  BEFORE INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_follow_rate_limit();
