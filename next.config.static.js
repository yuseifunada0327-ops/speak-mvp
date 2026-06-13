/** 静的エクスポート用設定（QRコード即時アクセス用） */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  // API ルートは静的化できないため、ビルド時に無視される
};
module.exports = nextConfig;
