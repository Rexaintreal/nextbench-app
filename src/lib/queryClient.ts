/**
 * React Query Client Configuration
 *
 * Centralized query client with sensible defaults for a mobile app.
 */

import { config } from "@/constants/config";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: config.query.staleTime,

      /** How long unused cached data is kept in memory */
      gcTime: config.query.gcTime,

      /** Number of retry attempts for failed queries */
      retry: config.query.retry,

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
