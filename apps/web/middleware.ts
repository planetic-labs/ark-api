import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public/auth paths
  const isAuthPath = path === '/' || path === '/code' || path === '/setup';
  
  // Check if refresh token cookie is present
  const hasRefreshToken = request.cookies.has('refresh_token');
  const hasAccessToken = request.cookies.has('access_token');
  const isAuthenticated = hasRefreshToken || hasAccessToken;

  // Static files or API routes - pass through
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && isAuthenticated) {
    // If authenticated, go to chats
    if (path !== '/setup') {
      return NextResponse.redirect(new URL('/chats', request.url));
    }
  }

  // Redirect unauthenticated users to login page
  if (!isAuthPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
