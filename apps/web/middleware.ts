import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Proxy /api/v1 requests to the backend dynamically at runtime
  if (path.startsWith('/api/v1')) {
    const getBackendUrl = () => {
      let url = process.env.INTERNAL_API_URL;
      if (!url) {
        if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
          url = process.env.NEXT_PUBLIC_API_URL;
        } else if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.startsWith('http')) {
          url = process.env.EXPO_PUBLIC_API_URL;
        }
      }
      if (url) {
        if (!url.endsWith('/api/v1')) {
          url = url.replace(/\/+$/, '') + '/api/v1';
        }
        return url;
      }
      return 'http://127.0.0.1:8000/api/v1';
    };

    const backendUrl = getBackendUrl();
    const targetPath = path.substring('/api/v1'.length);
    const searchParams = request.nextUrl.search;
    const destination = `${backendUrl}${targetPath}${searchParams}`;
    
    return NextResponse.rewrite(new URL(destination));
  }

  // Public/auth paths
  const isAuthPath = path === '/' || path === '/code' || path === '/setup';
  
  // Check if refresh token cookie is present
  const hasRefreshToken = request.cookies.has('refresh_token');
  const hasAccessToken = request.cookies.has('access_token');
  const isAuthenticated = hasRefreshToken || hasAccessToken;

  // Static files or local API routes - pass through
  if (
    path.startsWith('/_next') ||
    (path.startsWith('/api') && !path.startsWith('/api/v1')) ||
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
