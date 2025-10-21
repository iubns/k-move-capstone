/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'k-move-capstone'; // GitHub 저장소 이름

const nextConfig = {
  output: 'export',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}` : '',
  trailingSlash: true,
};

module.exports = nextConfig;
