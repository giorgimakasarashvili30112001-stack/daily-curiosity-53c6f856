# Retention & polish pack

Since no direction was picked, this plan takes the highest-value, lowest-risk set: make the daily content always ready, explain the coin/streak system to new users, and give people a reason to come back and share.

## 1. Content is always ready

Today the daily fact and quiz questions are generated the moment someone opens the app, so the first visitor of the day can see "still being prepared".

- Add a public endpoint at `src/routes/api/public/prewarm.ts` that tops up the fact library, picks tomorrow's fact, and pre-generates its first quiz question.
- Protect it with a shared secret header so only a scheduler can call it.
- The user can point any scheduler (Supabase cron or an external one) at the stable project URL once a day.
- The on-demand path stays as a fallback, so nothing breaks if the job misses.

## 2. Onboarding sheet

First-time visitors see a one-time explainer covering: one fact a day, answer yesterday's question, 1 coin per correct answer, 30 coins repairs a missed day, streak icon levels.

- New `src/components/OnboardingSheet.tsx`, dismissed state in localStorage.
- Rendered from `src/routes/index.tsx` only.

## 3. Weekly recap card

A "Your week" block on the profile page: facts read, questions answered, accuracy, coins earned, current streak — with a Share button reusing `ShareSheet`.

- New server function `getWeeklyRecap` in `src/lib/quiz.functions.ts` aggregating the last 7 days of `quiz_attempts`.
- Rendered in `src/routes/_authenticated/profile.tsx` above the existing stats grid.

## 4. Installable app (PWA)

- `public/manifest.webmanifest` plus icons, linked from `src/routes/__root.tsx`.
- No service worker or offline caching in this pass — install prompt only, keeps it simple and avoids stale-content bugs.

## Technical notes

- All new backend logic uses `createServerFn` in existing `*.functions.ts` files; the prewarm route is the only raw HTTP endpoint and it verifies its secret before doing work.
- No schema changes required — recap reads existing `quiz_attempts` and `favorites` rows.
- One new secret for the prewarm endpoint.
- Styling stays on existing tokens and the current card/rounded-3xl language.
