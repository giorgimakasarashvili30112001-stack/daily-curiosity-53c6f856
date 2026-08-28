# Fix streak settlement (missed days aren't charged)

## What's wrong

Checked your row in the database and the quiz history:

- Correct answers on **Aug 25** and **Aug 26**, nothing on **Aug 27**.
- Profile today: `streak 2`, `coins 34`, `last_seen_date = 2026-08-27` (written on Aug 27 at 08:30).

The streak logic decides "did you miss a day?" from `last_seen_date`, but that field is bumped by **visiting** the app, not by answering correctly. So Aug 27 got recorded as a normal day: today (Aug 28) the gap looks like 1 day, no missed day is detected, no 30 coins are charged, and the streak was never at risk. A day where you open the app but never answer correctly is currently invisible to the streak system.

## The fix

Track streak continuity from the last **correct answer**, not from the last visit.

1. Add two fields to the profile: the date of the last correct answer, and a "settled through" date that records which missed days have already been paid for (so coins are never charged twice for the same day). Backfill both from existing quiz history.
2. On login/profile load, settle every day between the last correct answer (or last settled day) and today:
   - each missed day costs 30 coins;
   - if the balance covers all of them, coins are deducted and the streak stays;
   - if it doesn't, the streak resets to 0 and no coins are taken;
   - mark those days settled so revisiting the same day doesn't charge again.
3. On a correct answer: streak +1 if the previous day was answered correctly or was paid for, otherwise the streak starts at 1. Record the date as the last correct answer. `last_seen_date` becomes purely informational.
4. Repair your current row as part of the change: Aug 27 is one missed day → 34 − 30 = **4 coins**, streak stays **2**.

## Technical notes

- Migration: `alter table profiles add column last_correct_date date, add column settled_through_date date;` plus a backfill from `max(quiz_date) where is_correct` per user, and the one-off correction for the affected profile.
- `src/lib/user.functions.ts` — `getProfile` settlement rewritten against `last_correct_date`/`settled_through_date`; drops the "park last_seen on yesterday" hack.
- `src/lib/quiz.functions.ts` — `submitQuizAnswer` streak branch uses the same two fields; missed-day charging stays only as a fallback for users who answer before the profile loads.
- `STREAK_SAVE_COST` (30) unchanged; coins still clamped at ≥ 0.
- `src/integrations/supabase/types.ts` updated for the new columns.
