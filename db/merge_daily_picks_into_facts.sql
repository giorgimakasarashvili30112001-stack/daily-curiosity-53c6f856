-- Run this once in the Supabase SQL editor of your personal project.
-- Merges daily_picks into facts: each fact carries its own scheduled date.

alter table public.facts add column if not exists pick_date date;

update public.facts f
set pick_date = d.pick_date
from public.daily_picks d
where d.fact_id = f.id;

create unique index if not exists facts_pick_date_key on public.facts (pick_date);
create index if not exists facts_unscheduled_idx on public.facts (created_at) where pick_date is null;

drop table if exists public.daily_picks;
