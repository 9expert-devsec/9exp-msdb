/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.cloudinary.com" }],
  },
  // ใส่ option อื่นๆ ที่คุณมีไว้ตรงนี้
};

export default nextConfig;