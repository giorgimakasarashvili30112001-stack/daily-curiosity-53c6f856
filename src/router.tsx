import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { setupFactCache } from "./lib/query-persist";

export const getRouter = () => {
  const queryClient = new QueryClient();
  // setupFactCache(queryClient);
  if (typeof window !== "undefined") (window as any).__qc = queryClient;


  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
