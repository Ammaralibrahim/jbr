import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const pathname = request.nextUrl.pathname;

  // API ve statik dosyaları atla
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname === '/signin';
  const isProtected = ['/dashboard', '/daily-logs', '/monthly-report', '/units', '/users'].some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  // Giriş yapmışsa ve signin'de → dashboard'a yönlendir
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Giriş yapmamışsa ve korumalı sayfada → signin'e yönlendir
  if (!token && isProtected) {
    const signinUrl = new URL('/signin', request.url);
    // Callback URL'yi her zaman /dashboard yap (güvenlik için)
    signinUrl.searchParams.set('callbackUrl', '/dashboard');
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};