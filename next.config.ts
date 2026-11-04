import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project so Turbopack doesn't get confused
  // by an unrelated package-lock.json higher up the filesystem (C:\).
  turbopack: {
    root: path.join(__dirname),
  },
  // Don't advertise the framework in an `X-Powered-By` header.
  poweredByHeader: false,
  // Security headers on every response. HSTS deliberately omits
  // includeSubDomains/preload — opt into those once every subdomain is HTTPS.
  // The CSP only sets frame-ancestors (clickjacking); a script-src policy
  // needs per-request nonces for Next's inline scripts and is a separate task.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  experimental: {
    // Server Actions cap request bodies at 1MB by default — too small for
    // homework/classwork file attachments (see src/lib/storage). 20mb leaves
    // headroom above the 15MB app-level file-size limit for multipart overhead.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // "Curriculum" was renamed to "Syllabus" — keep old bookmarks and links
  // working. `:path*` also matches the bare path, and query strings
  // (?classId=...) carry over automatically.
  redirects() {
    return [
      { source: "/curriculum/:path*", destination: "/syllabus/:path*", permanent: true },
      { source: "/portal/curriculum/:path*", destination: "/portal/syllabus/:path*", permanent: true },
      // Audit Log moved from Settings to the Insights section.
      { source: "/settings/audit-log", destination: "/audit-log", permanent: true },
    ];
  },
};

export default nextConfig;
