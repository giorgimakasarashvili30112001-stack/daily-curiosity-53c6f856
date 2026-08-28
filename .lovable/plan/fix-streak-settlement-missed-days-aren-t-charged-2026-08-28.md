# Fix streak settlement (missed days aren't charged)

## What's wrong

Checked your row in the database and the quiz history:

- Correct answers on **Aug 25** and **Aug 26**, nothing on **Aug 27**.
- Profile today: `streak 2`, `coins 34`, `last_seen_date = 2026-08-27` (written on Aug 27 at 08:30).

The streak logic decides "did you miss a day?" from `last_seen_date`, but that field is bumped by **visiting** the app, not by answering correctly. So Aug 27 got recorded as a normal day: today (Aug 28) the gap looks like 1 day, no missed day is detected, no 30 coins are charged, and the streak was never at risk. A day where you open the app but never answer correctly is currently invisible to the streak system.

## The fix

Track streak continuity from the last **correct answer**, read straight from `quiz_attempts`, and remember which missed days were bought back.

1. No "last correct date" column: derive it as `max(quiz_date) where is_correct = true` for the user.
2. Add one column to the profile: `saved_days` — the list of dates that were paid for with coins (30 each). Together with the correct-answer dates this fully describes the streak chain.
3. On login/profile load, settle every day between the last correct answer (or last saved day) and today:
   - each unsettled missed day costs 30 coins;
   - if the balance covers all of them, coins are deducted and each day is appended to `saved_days`, streak stays;
   - if it doesn't, the streak resets to 0 and no coins are taken;
   - days already in `saved_days` are never charged twice, so revisiting the same day is free.
4. On a correct answer: streak +1 if yesterday was a correct-answer day or is in `saved_days`, otherwise the streak starts at 1. `last_seen_date` becomes purely informational.
5. Repair your current row as part of the change: Aug 27 is one missed day → 34 − 30 = **4 coins**, streak stays **2**, and `2026-08-27` goes into `saved_days`.

The calendar on the profile can then also mark bought-back days differently from earned days (small follow-up, easy once `saved_days` exists).

## Technical notes

- Migration: `alter table profiles add column saved_days date[] not null default '{}';` plus the one-off correction for the affected profile.
- `src/lib/user.functions.ts` — `getProfile` settlement rewritten: query `quiz_attempts` for the latest correct `quiz_date`, combine with `saved_days`, charge unsettled gap days; drops the "park last_seen on yesterday" hack.
- `src/lib/quiz.functions.ts` — `submitQuizAnswer` streak branch uses the same derivation instead of `last_seen_date`.
- `STREAK_SAVE_COST` (30) unchanged; coins still clamped at ≥ 0.
- `src/integrations/supabase/types.ts` updated for the new column.

