import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
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

    const response = await fetch(`${backendUrl}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json(); // verify code response

    const res = NextResponse.json(data);

    // Set refresh token in HttpOnly cookie if present
    if (data.refresh_token) {
      res.cookies.set('refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Set access token in cookie for middleware verification
    if (data.access_token) {
      res.cookies.set('access_token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 15, // 15 mins
      });
    }

    return res;
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
