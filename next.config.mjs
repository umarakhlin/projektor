import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const org = process.env.SENTRY_ORG;
const project = process.env.SENTRY_PROJECT;

const useSentry = Boolean(dsn && org && project);

export default useSentry
  ? withSentryConfig(nextConfig, {
      org,
      project,
      silent: !process.env.CI,
      hideSourceMaps: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      authToken: process.env.SENTRY_AUTH_TOKEN
    })
  : nextConfig;
