/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix file watcher issues by using polling and limiting scope
  webpack: (config, { dev }) => {
    if (dev) {
      // Use polling instead of native file watching
      config.watchOptions = {
        poll: 2000, // Poll every 2 seconds
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
          '../../**', // Ignore parent directories
        ],
      }
    }
    return config
  },
  
  // Experimental features to reduce file watching
  experimental: {
    optimizePackageImports: ['@payloadcms/ui'],
  },
}

export default nextConfig