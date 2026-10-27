import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project so Turbopack doesn't get confused
  // by an unrelated package-lock.json higher up the filesystem (C:\).
  turbopack: {
    root: path.join(__dirname),
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
