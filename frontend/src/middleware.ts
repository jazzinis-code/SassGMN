import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lê o token do cookie salvo no callback OAuth
  const token = request.cookies.get('api_token')?.value;

  // Protege rotas do dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const url = new URL('/', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redireciona usuário autenticado da página de login para o dashboard
  if (pathname === '/' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
