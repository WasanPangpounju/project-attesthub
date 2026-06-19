'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Mail, RefreshCw, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function PendingPage() {
  const { user } = useUser()
  const router = useRouter()
  const email = user?.emailAddresses?.[0]?.emailAddress ?? ''

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] p-4">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2 no-underline">
        <ShieldCheck size={22} color="#0f7c6e" />
        <span className="text-lg font-bold text-[#1a2744]">Attesthub</span>
      </Link>

      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Icon */}
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f4f2]">
              <Clock size={32} color="#0f7c6e" />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-center text-xl font-bold text-[#1a2744]">
            รอการยืนยันสิทธิ์
          </h1>

          {/* Subtitle */}
          <p className="mb-1 text-center text-sm text-[#5a6478]">
            บัญชีของคุณถูกสร้างเรียบร้อยแล้ว
          </p>
          {email && (
            <p className="mb-6 text-center text-sm font-medium text-[#1a2744]">
              {email}
            </p>
          )}

          {/* Description */}
          <div className="mb-6 rounded-xl bg-[#f0faf9] border border-[#c8ece8] p-4">
            <p className="text-sm leading-relaxed text-[#3d4a5c] text-center">
              กรุณารอ Admin กำหนดสิทธิ์การเข้าใช้งาน
              <br />
              ทีมงานจะดำเนินการภายใน <strong>1-2 วันทำการ</strong>
            </p>
          </div>

          {/* Support */}
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-[#5a6478]">
            <Mail size={15} color="#0f7c6e" />
            <span>ติดต่อทีมงาน:</span>
            <a
              href="mailto:support@attesthub.com"
              className="font-medium text-[#0f7c6e] no-underline hover:underline"
            >
              support@attesthub.com
            </a>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={() => router.refresh()}
            variant="outline"
            className="w-full border-[#0f7c6e] text-[#0f7c6e] hover:bg-[#e6f4f2]"
          >
            <RefreshCw size={15} className="mr-2" />
            ตรวจสอบสถานะ
          </Button>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-[#94a3b8]">
        © 2024 Attesthub · Accessibility Testing Service
      </p>
    </div>
  )
}
