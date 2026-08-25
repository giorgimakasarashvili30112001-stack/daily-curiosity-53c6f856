import { hydrate, dehydrate, type QueryClient, type Query } from "@tanstack/react-query";

const STORAGE_KEY = "daily-curiosity-facts-cache-v1";
const MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Only fact content is cached offline — never user/session-specific data. */
function isCacheable(query: Query): boolean {
  const key = query.queryKey[0];
  if (key !== "archive" && key !== "fact" && key !== "today-fact") return false;
  // Persisting a pending query would restore an unresolvable promise and the
  // query would hang forever on the next visit.
  return query.state.status === "success" && query.state.data !== undefined;
}

type Stored = { timestamp: number; state: unknown };

/**
 * Restores cached fact content from localStorage synchronously (so route
 * loaders can read it before any network call) and keeps it in sync.
 */
export function setupFactCache(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      if (Date.now() - parsed.timestamp < MAX_AGE) {
        hydrate(queryClient, parsed.state);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {
    // Corrupt cache: ignore and start fresh.
  }

  const save = () => {
    try {
      const state = dehydrate(queryClient, { shouldDehydrateQuery: isCacheable });
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), state } satisfies Stored),
      );
    } catch {
      // Storage full or unavailable — caching is best-effort.
    }
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  queryClient.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 300);
  });

  // SSR-hydrated data never triggers the cache subscription, so flush once
  // after startup and again when the page is backgrounded or closed.
  setTimeout(save, 1500);
  window.addEventListener("load", () => setTimeout(save, 0));
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
}
