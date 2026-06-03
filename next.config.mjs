/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "quickchart.io",
        pathname: "/qr",
      },
    ],
  },
};

export default nextConfig;
