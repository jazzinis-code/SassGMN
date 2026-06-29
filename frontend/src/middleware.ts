import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de proteção de rotas.
 *
 * Usa o cookie `api_token` (JWT do backend) como indicador de sessão.
 * O cookie é gravado pela página /auth/callback após o OAuth via backend.
 *
 * Anteriormente usava next-auth/jwt, mas o fluxo OAuth é feito diretamente
 * pelo backend NestJS — o NextAuth não está mais no caminho do login.
 */
export async function middleware(request: NextRequest) {
  const apiToken = request.cookies.get('api_token')?.value;
  const { pathname } = request.nextUrl;

  // Rotas do dashboard exigem sessão ativa
  if (pathname.startsWith('/dashboard')) {
    if (!apiToken) {
      const url = new URL('/', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Usuário autenticado na raiz → redireciona para dashboard
  if (pathname === '/' && apiToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
