import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const paid = token && (token as any).stripePaymentStatus === 'paid';

  if (pathname === '/login' || pathname === '/signup') {
    if (paid) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith('/payment-required')) {
    if (!token) {
      const login = new URL('/login', request.url);
      login.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/settings')) {
    if (!token) {
      const login = new URL('/login', request.url);
      login.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(login);
    }
    if (!paid) return NextResponse.redirect(new URL('/payment-required', request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/v1')) {
    if (!token) {
      return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
    }
    if (!paid) {
      return NextResponse.json({ error: { code: 403, message: 'Paiement requis' } }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/stripe/create-checkout')) {
    if (!token) {
      return NextResponse.json({ error: { code: 401, message: 'Non connecté' } }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
