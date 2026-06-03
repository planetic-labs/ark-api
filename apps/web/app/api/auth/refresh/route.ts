import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${backendUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Clear cookies if refresh failed
      const res = NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
      res.cookies.delete('refresh_token');
      res.cookies.delete('access_token');
      return res;
    }

    const data = await response.json(); // returns new access_token & refresh_token

    const res = NextResponse.json(data);

    if (data.refresh_token) {
      res.cookies.set('refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

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
