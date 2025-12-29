import { NextResponse } from 'next/server';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Spotify credentials not configured' },
      { status: 500 }
    );
  }

  // Get room code from query params to pass through OAuth flow
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get('roomCode') || '';

  // Generate state parameter with room code for CSRF protection and room association
  const state = Buffer.from(JSON.stringify({ roomCode, ts: Date.now() })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    show_dialog: 'true', // Force login dialog
  });

  const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;

  return NextResponse.json({ authUrl });
}
