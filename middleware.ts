import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromRequest } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login', '/register', '/'];
  const publicApiRoutes = ['/api/auth/login', '/api/auth/register'];

  if (publicRoutes.includes(pathname) || publicApiRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  const user = await getUserFromRequest(request);

  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/api/'))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
