import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Development bypass
  const authEnabled = process.env.ENABLE_AUTH === 'true';

  // If authentication is disabled, allow everything
  if (!authEnabled) {
    // Optional: prevent opening login page during development
    if (pathname === '/main/login') {
      return NextResponse.redirect(new URL('/purchase', request.url));
    }

    return NextResponse.next();
  }

  // --------------------------------------------------
  // Authentication enabled
  // --------------------------------------------------

  const authToken = request.cookies.get('auth_token')?.value;

  // Protected routes
  const isProtectedRoute =
    pathname.startsWith('/purchase') ||
    pathname.startsWith('/wms') ||
    pathname.startsWith('/admin');

  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL('/main/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);

    return NextResponse.redirect(loginUrl);
  }

  // Auth/root routes
  const isAuthRoute =
    pathname === '/main/login' ||
    pathname === '/';

  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL('/purchase', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/main/login',
    '/purchase/:path*',
    '/portal/:path*',
    '/admin/:path*',
    '/wms/:path*',
  ],
};