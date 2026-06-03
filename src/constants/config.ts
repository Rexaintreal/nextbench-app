/**
 * App-wide configuration constants
 */

export const config = {
  /** App metadata */
  app: {
    name: "NextBench",
    scheme: "nextbench",
    version: "1.0.0",
  },

  /** Environment */
  env: (process.env.EXPO_PUBLIC_APP_ENV ?? "development") as
    | "development"
    | "staging"
    | "production",

  /** Feature flags — toggle features without deploys */
  features: {
    enableGoogleSignIn: false, // Phase 2
    enableNotifications: false, // Phase 6
    enableImageUpload: true,
  },

  /** React Query defaults */
  query: {
    /** Data considered fresh for 2 minutes */
    staleTime: 1000 * 60 * 2,
    /** Cache retained for 5 minutes after unmount */
    gcTime: 1000 * 60 * 5,
    /** Retry failed queries up to 2 times */
    retry: 2,
  },

  /** Pagination defaults */
  pagination: {
    feedPageSize: 20,
    searchPageSize: 15,
    notificationsPageSize: 20,
  },
} as const;
