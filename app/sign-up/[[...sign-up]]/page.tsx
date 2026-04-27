'use client'

import { useState } from 'react'
import { SignUp } from '@clerk/nextjs'
import { ShieldCheck, Search, FileText, Users } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function Page() {
  const [showForm, setShowForm] = useState(false)
  const { t } = useTranslation()
  const s = t.signUpIntro

  const features = [
    { icon: Search, text: s.feature1 },
    { icon: FileText, text: s.feature2 },
    { icon: Users, text: s.feature3 },
  ]

  if (showForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <SignUp />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      {/* Header */}
      <header className="border-b border-[#e2e8f0] bg-white px-6">
        <div className="mx-auto flex h-16 max-w-300 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <ShieldCheck size={20} color="#13a08e" />
            <span className="text-base font-bold text-navy">Attesthub</span>
          </Link>
          <Link href="/sign-in" className="text-sm text-[#5a6478] no-underline">
            {s.alreadyHaveAccount}{' '}
            <span className="font-semibold text-teal">{s.signIn}</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-8">
        <div className="mx-auto w-full max-w-140">
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <span className="rounded-full bg-teal-bg px-4 py-1 text-xs font-bold uppercase tracking-widest text-teal">
              {s.badge}
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-4 whitespace-pre-line text-center text-2xl font-bold leading-snug text-navy md:text-3xl">
            {s.title}
          </h1>
          <p className="mb-10 text-center text-[15px] leading-relaxed text-[#5a6478]">
            {s.description}
          </p>

          {/* Features */}
          <div className="mb-10 flex flex-col gap-3">
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-teal-bg">
                  <Icon size={18} color="#0f7c6e" />
                </div>
                <p className="pt-1.5 text-sm leading-relaxed text-[#3d4a5c]">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full cursor-pointer rounded-xl bg-teal py-3.5 text-base font-semibold text-white"
          >
            {s.ctaButton}
          </button>
          <p className="mt-3 text-center text-xs text-[#94a3b8]">
            {s.ctaNote}
          </p>
        </div>
      </main>
    </div>
  )
}
