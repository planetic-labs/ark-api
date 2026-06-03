import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
      ? process.env.NEXT_PUBLIC_API_URL
      : 'http://127.0.0.1:8000/api/v1';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    await fetch(`${backendUrl}/auth/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refresh_token: refreshToken || null }),
    });
  } catch (e) {
    // Ignore backend logout errors, proceed to clear local session
  }

  const response = NextResponse.json({ message: 'Logged out successfully' });
  
  // Clear cookies
  response.cookies.delete('refresh_token');
  response.cookies.delete('access_token');

  return response;
}
