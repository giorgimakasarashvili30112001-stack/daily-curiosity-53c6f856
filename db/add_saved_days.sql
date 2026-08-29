-- Streak settlement: remember which missed days were bought back with coins.
-- Run this in the Supabase SQL editor.

alter table public.profiles
  add column if not exists saved_days date[] not null default '{}';

-- One-off correction: Aug 27 2026 was missed (no correct answer) but never charged.
update public.profiles
set coins = greatest(0, coins - 30),
    saved_days = array['2026-08-27']::date[],
    updated_at = now()
where id = '234b2ea5-6123-453a-901c-28387fb106ad'
  and not (saved_days @> array['2026-08-27']::date[]);
