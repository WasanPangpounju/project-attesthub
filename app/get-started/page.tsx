import Link from "next/link"
import { Header } from "@/components/header"
import { ShieldCheck, Search, FileText, Users } from "lucide-react"

export default function GetStartedPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAFAF8" }}>
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">

          {/* Logo mark */}
          <div className="flex justify-center mb-8">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "#0f7c6e" }}
            >
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Heading */}
          <h1
            className="text-center font-semibold text-3xl md:text-4xl mb-4"
            style={{ color: "#1a2744" }}
          >
            AttestHub คืออะไร?
          </h1>
          <p className="text-center text-base leading-relaxed mb-12" style={{ color: "#5a6478" }}>
            แพลตฟอร์มตรวจสอบ Accessibility ครบวงจร ช่วยให้เว็บไซต์และแอปของคุณ
            เข้าถึงได้สำหรับทุกคน ตามมาตรฐาน WCAG 2.2
          </p>

          {/* Features */}
          <div className="grid gap-4 sm:grid-cols-3 mb-12">
            {[
              {
                icon: Search,
                title: "ตรวจสอบอัตโนมัติ",
                desc: "สแกนเว็บไซต์ตามมาตรฐาน WCAG 2.2 ได้ทันที",
              },
              {
                icon: Users,
                title: "ผู้เชี่ยวชาญตรวจสอบ",
                desc: "ทีม Tester มืออาชีพตรวจสอบเชิงลึกเพิ่มเติม",
              },
              {
                icon: FileText,
                title: "รายงานละเอียด",
                desc: "รับรายงานพร้อมคำแนะนำนำไปปฏิบัติได้จริง",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center rounded-2xl p-6"
                style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#e8f5f3" }}
                >
                  <item.icon className="h-5 w-5" style={{ color: "#0f7c6e" }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "#1a2744" }}>
                  {item.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#5a6478" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center w-full max-w-sm rounded-[14px] px-6 py-3 text-base font-semibold text-white transition-colors"
              style={{ backgroundColor: "#0f7c6e" }}
            >
              สมัครใช้งานฟรี
            </Link>
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/sign-in" className="underline" style={{ color: "#0f7c6e" }}>
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}
