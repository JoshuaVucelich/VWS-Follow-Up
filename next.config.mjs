/**
 * next.config.mjs
 *
 * Next.js configuration for VWS FollowUp.
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Experimental features.
   */
  experimental: {},

  /**
   * Image domains allowed for next/image optimization.
   * Add hostnames here if you allow users to set external logo/avatar URLs.
   */
  images: {
    remotePatterns: [],
  },

  /**
   * Redirect root to /dashboard (auth guard lives in middleware.ts).
   */
  async redirects() {
    return [];
  },
};

export default nextConfig;
