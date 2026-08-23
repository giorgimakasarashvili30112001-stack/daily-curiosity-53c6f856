-- Remove columns the app never reads or displays.
alter table public.facts drop column if exists question_type;
alter table public.facts drop column if exists source;
