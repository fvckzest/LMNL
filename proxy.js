import { NextResponse } from 'next/server';

const exactRoutes = new Set([
  '/',
  '/about',
  '/app',
  '/app/login',
  '/app/onboarding',
  '/auth/callback',
  '/blog',
  '/community',
  '/community/share',
  '/contact',
  '/email-lab',
  '/events',
  '/events/space',
  '/home',
  '/intake',
  '/login',
  '/portfolio',
  '/prsm',
  '/services',
  '/share-your-work',
  '/shop',
  '/space',
  '/success',
]);

const dynamicRoutePatterns = [
  /^\/blog\/[^/]+$/,
  /^\/check-in\/[^/]+$/,
  /^\/dashboard\/[^/]+$/,
  /^\/ticket\/[^/]+$/,
];

function isMigratedRoute(pathname) {
  return exactRoutes.has(pathname)
    || dynamicRoutePatterns.some((pattern) => pattern.test(pathname));
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isMigratedRoute(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next(?:/|$)|.*\\..*).*)'],
};
