import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;

  // API rotalarını atla
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Statik dosyaları atla
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Signin sayfası kontrolü
  if (pathname === '/signin') {
    if (token) {
      // Kullanıcı zaten giriş yapmış, dashboard'a yönlendir
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Korumalı sayfalar
  const protectedPaths = ['/dashboard', '/daily-logs', '/monthly-report', '/units', '/users'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath && !token) {
    // Giriş yapılmamış, signin sayfasına yönlendir
    const signinUrl = new URL('/signin', request.url);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};