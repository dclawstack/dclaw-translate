/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8104";

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${API_BASE}/api/v1/:path*` },
      { source: "/health", destination: `${API_BASE}/health` },
      { source: "/health/", destination: `${API_BASE}/health/` },
    ];
  },
}

module.exports = nextConfig
