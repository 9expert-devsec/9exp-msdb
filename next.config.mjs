/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.cloudinary.com" }],
  },
};

export default nextConfig;
