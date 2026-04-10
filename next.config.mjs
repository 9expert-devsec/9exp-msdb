/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.cloudinary.com" }],
  },
  experimental: {
    middlewareClientMaxBodySize: "10mb",
  },
};

export default nextConfig;