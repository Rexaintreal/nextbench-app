/**
 * React Query Client Configuration
 *
 * Centralized query client with sensible defaults for a mobile app.
 */

import { QueryClient } from "@tanstack/react-query";
import { config } from "@/constants/config";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** How long data is considered "fresh" before refetching */
      staleTime: config.query.staleTime,

      /** How long unused cached data is kept in memory */
      gcTime: config.query.gcTime,

      /** Number of retry attempts for failed queries */
      retry: config.query.retry,

      /** Don't refetch when window regains focus on mobile — can cause jank */
      refetchOnWindowFocus: false,

      /** Refetch when network reconnects — important for mobile */
      refetchOnReconnect: true,
    },
    mutations: {
      /** Retry failed mutations once */
      retry: 1,
    },
  },
});
