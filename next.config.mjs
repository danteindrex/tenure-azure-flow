import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next uses this project as the workspace root (fixes multi-lockfile warning)
  outputFileTracingRoot: path.join(process.cwd()),
  reactStrictMode: true,
};

export default nextConfig;