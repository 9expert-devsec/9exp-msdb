import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import localFont from "next/font/local";

const lineSeedSans = localFont({
  src: [
    { path: "../../public/fonts/line-seed/LINESeedSansTH_W_Rg.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/line-seed/LINESeedSansTH_W_Bd.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-line-seed",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "9Expert MSDB",
  description:
    "9Expert MSDB ระบบจัดการกิจกรรมและแบบฟอร์มออนไลน์สำหรับ 9Expert Training",

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  // openGraph: {
  //   title: "9Expert x DATA + AI DAY 2025",
  //   description: "9Expert ขอขอบคุณที่ทุกคนเข้ามาร่วมงาน DATA + AI DAY 2025 | สมัครเข้าร่วมกิจกรรม | รับข่าวสารจาก 9Expert Training",
  //   url: "https://9exp-sec.com",
  //   siteName: "EVENT",
  //   images: [
  //     {
  //       url: "/og-image.jpg", // optional ถ้ามีรูปโปรโมต
  //       width: 1200,
  //       height: 630,
  //       alt: "9Expert DATA + AI DAY 2025",
  //     },
  //   ],
  //   locale: "th_TH",
  //   type: "website",
  // },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${lineSeedSans.variable}`}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
