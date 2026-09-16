import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The one that earns its place here is `connect-src 'self'`. Suci holds
 * menstrual health data and talks to no server, so there is no legitimate
 * outbound request at all — which means any attempt to make one is an
 * exfiltration attempt, and this header stops it. A compromised dependency is
 * the realistic threat for an app with no backend and no user-generated HTML.
 *
 * `script-src` keeps 'unsafe-inline' because every page is statically rendered
 * and Next emits inline bootstrap scripts whose hashes vary per page. Removing
 * it means moving to nonces, which forces dynamic rendering on every route.
 * That trade is not worth it while the XSS surface is this small: no
 * third-party content, no user HTML, and React escaping everything. Revisit if
 * a backend ever lands — that is the moment the calculus changes.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  // Nothing may embed this app — it would put a cycle status in someone
  // else's page.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts, so no external font origin is needed.
  "font-src 'self'",
  "img-src 'self' data:",
  "manifest-src 'self'",
  "worker-src 'self'",
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  // No feature this app uses needs any of these.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The app is not a search result; it is someone's private record.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The service worker must always be revalidated. A CDN holding an old
        // copy would pin every installed user to a stale app with no way to
        // update, which is the worst failure mode a PWA has.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Icons are not content-hashed, so they revalidate daily rather than
        // being pinned for a year.
        source: "/:icon(icon-.*\\.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
      {
        // The share page is the only thing anyone else ever opens. Nothing may
        // cache it between the user and the reader, and it must never be
        // indexed.
        source: "/s/:token*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
