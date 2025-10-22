import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'k-move-capstone'; // GitHub 저장소 이름

// Allow forcing basePath via env (useful in CI or local testing)
const forcedBase = process.env.NEXT_PUBLIC_BASE_PATH || (process.env.GITHUB_PAGES === 'true' ? `/${repoName}` : undefined);

const nextConfig: NextConfig = {
  output: 'export',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  // Use forcedBase if provided; otherwise use production basePath, else empty
  basePath: forcedBase ?? (isProd ? `/${repoName}` : ''),
  assetPrefix: forcedBase ?? (isProd ? `/${repoName}` : ''),
  trailingSlash: true,
};

export default nextConfig;
