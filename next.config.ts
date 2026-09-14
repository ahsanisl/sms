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
};

export default nextConfig;
