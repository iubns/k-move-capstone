import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'k-move-capstone'; // GitHub 저장소 이름

const nextConfig: NextConfig = {
  output: 'export',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}` : '',
  trailingSlash: true,
};

export default nextConfig;
