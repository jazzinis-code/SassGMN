import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica o token JWT do backend (salvo como cookie após o callback OAuth)
  const apiToken = request.cookies.get('api_token')?.value;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!apiToken) {
      const url = new URL('/', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users from login page to dashboard
  if (pathname === '/' && apiToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
