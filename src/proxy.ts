import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/token';

const PUBLIC_PATHS = ['/login'];

/**
 * AUTH_MODE=demo (default): no server-side enforcement — the legacy
 * client-side demo auth (Zustand) handles login. Used until all pages are
 * migrated to the database.
 * AUTH_MODE=db: every non-public route requires a valid session JWT.
 */
export async function proxy(request: NextRequest) {
  if (process.env.AUTH_MODE !== 'db') {
    return NextResponse.next({ request });
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
  if (session && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api/health|api/branding|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
