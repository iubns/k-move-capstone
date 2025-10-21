import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'terab'; // GitHub 저장소 이름으로 변경

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}` : '',
  trailingSlash: true,
};

export default nextConfig;
