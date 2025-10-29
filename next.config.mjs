import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next uses this project as the workspace root (fixes multi-lockfile warning)
  outputFileTracingRoot: path.join(process.cwd()),
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/SignUp", destination: "/signup" },
    ];
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "https://home-solutions-eta.vercel.app" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
};

export default nextConfig;