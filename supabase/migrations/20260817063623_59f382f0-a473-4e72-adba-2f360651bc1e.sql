CREATE TABLE public.facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  question_type text NOT NULL CHECK (question_type IN ('how','what')),
  category text NOT NULL,
  hook text NOT NULL,
  intro text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  surprising_detail text NOT NULL,
  source text NOT NULL DEFAULT 'curated' CHECK (source IN ('curated','ai')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.facts TO anon, authenticated;
GRANT ALL ON public.facts TO service_role;
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Facts are readable by everyone" ON public.facts FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX facts_created_at_idx ON public.facts (created_at);

CREATE TABLE public.daily_picks (
  pick_date date PRIMARY KEY,
  fact_id uuid NOT NULL UNIQUE REFERENCES public.facts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_picks TO anon, authenticated;
GRANT ALL ON public.daily_picks TO service_role;
ALTER TABLE public.daily_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Past and present picks are readable by everyone" ON public.daily_picks FOR SELECT TO anon, authenticated USING (pick_date <= (now() AT TIME ZONE 'utc')::date);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  streak_count integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_seen_date date,
  coins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  fact_id uuid NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fact_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add their own favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own favorites" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id uuid NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  question_index integer NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL,
  explanation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_questions TO anon, authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quiz questions are readable by everyone" ON public.quiz_questions FOR SELECT TO anon, authenticated USING (true);
CREATE UNIQUE INDEX quiz_questions_fact_index_key ON public.quiz_questions (fact_id, question_index);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_date date NOT NULL,
  fact_id uuid NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  question_index integer NOT NULL DEFAULT 0,
  selected_index integer NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own quiz attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can record their own quiz attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX quiz_attempts_user_date_question_key ON public.quiz_attempts (user_id, quiz_date, question_index);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quiz_questions_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();