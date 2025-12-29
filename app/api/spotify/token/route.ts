import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// GET: Retrieve tokens from cookie (after OAuth callback)
export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('spotify_tokens');

  if (!tokensCookie) {
    return NextResponse.json({ error: 'No tokens available' }, { status: 404 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

    // Clear the cookie after retrieval
    const response = NextResponse.json(tokens);
    response.cookies.delete('spotify_tokens');

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid token data' }, { status: 400 });
  }
}

// POST: Refresh access token
export async function POST(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Spotify credentials not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Missing refresh_token' },
        { status: 400 }
      );
    }

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Token refresh failed', details: errorData },
        { status: response.status }
      );
    }

    const tokens = await response.json();

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      expires_at: Date.now() + tokens.expires_in * 1000,
      // Spotify may return a new refresh token
      refresh_token: tokens.refresh_token || refresh_token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
