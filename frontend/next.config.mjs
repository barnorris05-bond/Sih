/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@aicte/backend", "@aicte/shared"],
  experimental: {
    serverComponentsExternalPackages: ["jose"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
