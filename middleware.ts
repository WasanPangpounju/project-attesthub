import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, locales, defaultLocale } from './lib/i18n/config';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/free-scan',
  '/free-scan/(.*)',
  '/api/guest-scan/(.*)',
  '/reports/shared/(.*)',
  '/api/reports/shared/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // ตรวจสอบว่าหน้าปัจจุบันไม่ใช่หน้า Public
  if (!isPublicRoute(req)) {
    // ใช้ await และเรียก protect() จากก้อน auth ที่ถูกส่งเข้ามา
    await auth.protect();
  }

  // Locale detection: cookie > Accept-Language > default
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value
  let locale: string = defaultLocale

  if (cookieLocale && locales.includes(cookieLocale as typeof locales[number])) {
    locale = cookieLocale
  } else {
    const acceptLang = req.headers.get('accept-language')
    if (acceptLang) {
      const preferred = acceptLang.split(',')[0].split('-')[0].trim().toLowerCase()
      if (locales.includes(preferred as typeof locales[number])) {
        locale = preferred
      }
    }
  }

  const response = NextResponse.next()
  response.headers.set('x-locale', locale)
  return response
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};