-- Timezone-safe midnight streak settlement.
-- Run once in the Supabase SQL editor.

-- 1. Per-user timezone + idempotency marker for the nightly job.
alter table public.profiles
  add column if not exists timezone text not null default 'UTC',
  add column if not exists settled_date date;

-- 2. Single-flight lease for the scheduled job.
create table if not exists public.job_locks (
  name text primary key,
  locked_until timestamptz not null,
  updated_at timestamptz not null default now()
);

grant all on public.job_locks to service_role;
alter table public.job_locks enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this table.

-- 3. Cursor so each run continues where the previous one stopped.
create table if not exists public.job_cursors (
  name text primary key,
  cursor text,
  updated_at timestamptz not null default now()
);

grant all on public.job_cursors to service_role;
alter table public.job_cursors enable row level security;

-- 4. Hourly cron: every user is settled shortly after their own local midnight.
--    Replace <PROJECT_URL> and <SECRET> before running.
-- select cron.schedule(
--   'settle-streaks-hourly',
--   '1 * * * *',
--   $$
--   select net.http_post(
--     url := '<PROJECT_URL>/api/public/settle-streaks',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer <SECRET>"}'::jsonb
--   );
--   $$
-- );
