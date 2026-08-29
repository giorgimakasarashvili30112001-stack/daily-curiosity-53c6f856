-- Streak tracking columns. Run this in the Supabase SQL editor.

alter table public.profiles
  add column if not exists saved_days date[] not null default '{}',
  -- last day that counted toward the current streak (correct answer, bought back, or day one)
  add column if not exists streak_anchor date;

-- Seed the anchor from existing history so nobody is charged for old gaps.
update public.profiles p
set streak_anchor = coalesce(
      (select max(a.quiz_date) from public.quiz_attempts a
        where a.user_id = p.id and a.is_correct),
      p.last_seen_date
    )
where p.streak_anchor is null;
