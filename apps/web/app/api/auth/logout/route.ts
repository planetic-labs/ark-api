import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (accessToken) {
    // Notify backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      await fetch(`${backendUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (e) {
      // Ignore backend logout errors, proceed to clear local session
    }
  }

  const response = NextResponse.json({ message: 'Logged out successfully' });
  
  // Clear cookies
  response.cookies.delete('refresh_token');
  response.cookies.delete('access_token');

  return response;
}
