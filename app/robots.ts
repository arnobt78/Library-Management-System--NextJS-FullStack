/**
 * Single crawl policy source (no public/robots.txt).
 * Allow catalog SEO; disallow auth/admin/API and AI scrapers.
 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/_next/",
          "/api/",
          "/admin/",
          "/sign-in",
          "/sign-up",
          "/my-profile",
          "/make-admin",
          "/api-status",
          "/api-docs",
          "/performance",
          "/too-fast",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "anthropic-ai",
          "Claude-Web",
        ],
        disallow: "/",
      },
    ],
  };
}
