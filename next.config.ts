import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project so Turbopack doesn't get confused
  // by an unrelated package-lock.json higher up the filesystem (C:\).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
