import { NextResponse } from 'next/server';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/clown-club/host?error=config', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/clown-club/host?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/clown-club/host?error=no_code', request.url));
  }

  // Decode state to get room code
  let roomCode = '';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      roomCode = decoded.roomCode || '';
    } catch {
      // Invalid state, continue without room code
    }
  }

  try {
    // Exchange authorization code for tokens
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.redirect(
        new URL(`/clown-club/host?error=token_exchange&message=${errorData.error}`, request.url)
      );
    }

    const tokens = await response.json();

    // Create redirect URL with tokens in hash (client-side only)
    // The client will send these tokens to the game server via socket
    const redirectUrl = new URL('/clown-club/host', request.url);
    redirectUrl.searchParams.set('spotify_auth', 'success');
    if (roomCode) {
      redirectUrl.searchParams.set('roomCode', roomCode);
    }

    // Store tokens temporarily in a cookie for the client to retrieve
    // This is secure because:
    // 1. httpOnly prevents JS access (except our API route)
    // 2. Tokens expire in 1 hour anyway
    // 3. We'll clear this cookie after client retrieves tokens
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };

    const response2 = NextResponse.redirect(redirectUrl);
    response2.cookies.set('spotify_tokens', JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes to retrieve tokens
      path: '/',
    });

    return response2;
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/clown-club/host?error=fetch_failed`, request.url)
    );
  }
}
