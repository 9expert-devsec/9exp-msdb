import { redirect } from "next/navigation";

export default function Home() {
  // บังคับให้ root ไปหน้า login เสมอ
  redirect("/admin/dashboard");
}