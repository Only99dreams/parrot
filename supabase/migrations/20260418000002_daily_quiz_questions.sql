-- Daily quiz questions table - stores AI-generated questions per day
CREATE TABLE IF NOT EXISTS public.daily_quiz_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_date date NOT NULL,
  question_number smallint NOT NULL CHECK (question_number BETWEEN 1 AND 5),
  question text NOT NULL,
  options jsonb NOT NULL,        -- ["Option A", "Option B", "Option C", "Option D"]
  correct_index smallint NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  category text NOT NULL,
  explanation text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (quiz_date, question_number)
);

-- Everyone can read quiz questions (no auth required for quiz)
ALTER TABLE public.daily_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quiz questions"
  ON public.daily_quiz_questions
  FOR SELECT
  USING (true);

-- Only service role can insert (edge function)
CREATE POLICY "Service role can insert quiz questions"
  ON public.daily_quiz_questions
  FOR INSERT
  WITH CHECK (false);  -- blocked via RLS; edge function uses service role key which bypasses RLS

CREATE INDEX idx_daily_quiz_date ON public.daily_quiz_questions(quiz_date);
