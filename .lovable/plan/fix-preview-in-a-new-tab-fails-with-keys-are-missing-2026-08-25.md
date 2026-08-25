# Fix: preview in a new tab fails with "keys are missing"

## What's wrong

The app's Supabase URL and publishable key currently live only in the local `.env` file, and `.env` is listed in `.gitignore`. The in-editor preview works because the sandbox has that file, but the standalone preview/published build never receives it — so the browser client throws "Missing Supabase environment variable(s)" and the page fails to load.

The service-role key is unaffected: it's stored as a project secret (`SB_SERVICE_ROLE_KEY`) and is injected server-side correctly.

## Fix

Move the two *public* values (project URL and publishable/anon key — both safe to ship in client code, they're protected by row-level security) into a committed config file, and keep env vars as an override.

1. Add `src/integrations/supabase/config.ts` exporting `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` with the real values as defaults.
2. Update `src/integrations/supabase/client.ts` to fall back to these constants at the end of its existing env lookup chain, so any env var still wins if present.
3. Update `src/integrations/supabase/client.server.ts` to use the same URL fallback (it keeps requiring the service-role key from secrets, which stays server-only).
4. Keep `.env` as-is for local overrides; no secret is committed.

## Verify

Load the preview in a standalone tab and confirm the daily fact, archive, and auth pages render without the missing-keys error.
