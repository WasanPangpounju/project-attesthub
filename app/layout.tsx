import type React from "react"
import type { Metadata , Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"],
  variable: "--font-geist-sans", 
 })
const _geistMono = Geist_Mono({ subsets: ["latin"],
    variable: "--font-geist-mono", 
 })

export const metadata: Metadata = {
  title: "Attesthub - Building an Accessible World, For Everyone",
  description:
    "Expert accessibility auditing services for websites, apps, and physical spaces, guided by real users and industry standards.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

// ย้ายมาจาก layout ของ login
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#252525" },
  ],
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
              <ClerkProvider>
    <html lang="en">
                <body className={`${_geist.variable} ${_geistMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
        </ClerkProvider>
  )
}
