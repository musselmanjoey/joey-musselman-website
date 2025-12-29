import { NextResponse } from 'next/server';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

type PlaybackAction = 'play' | 'pause' | 'next' | 'previous' | 'queue' | 'state';

interface PlaybackRequest {
  action: PlaybackAction;
  access_token: string;
  uri?: string; // For queue action
  context_uri?: string; // For play action (album/playlist)
  uris?: string[]; // For play action (specific tracks)
  position_ms?: number; // For seek
}

export async function POST(request: Request) {
  try {
    const body: PlaybackRequest = await request.json();
    const { action, access_token, uri, context_uri, uris, position_ms } = body;

    if (!access_token) {
      return NextResponse.json(
        { error: 'Missing access_token' },
        { status: 401 }
      );
    }

    const headers = {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    switch (action) {
      case 'state':
        response = await fetch(`${SPOTIFY_API_URL}/me/player`, {
          headers,
        });
        break;

      case 'play':
        const playBody: Record<string, unknown> = {};
        if (context_uri) playBody.context_uri = context_uri;
        if (uris) playBody.uris = uris;
        if (position_ms !== undefined) playBody.position_ms = position_ms;

        response = await fetch(`${SPOTIFY_API_URL}/me/player/play`, {
          method: 'PUT',
          headers,
          body: Object.keys(playBody).length > 0 ? JSON.stringify(playBody) : undefined,
        });
        break;

      case 'pause':
        response = await fetch(`${SPOTIFY_API_URL}/me/player/pause`, {
          method: 'PUT',
          headers,
        });
        break;

      case 'next':
        response = await fetch(`${SPOTIFY_API_URL}/me/player/next`, {
          method: 'POST',
          headers,
        });
        break;

      case 'previous':
        response = await fetch(`${SPOTIFY_API_URL}/me/player/previous`, {
          method: 'POST',
          headers,
        });
        break;

      case 'queue':
        if (!uri) {
          return NextResponse.json(
            { error: 'Missing uri for queue action' },
            { status: 400 }
          );
        }
        response = await fetch(`${SPOTIFY_API_URL}/me/player/queue?uri=${encodeURIComponent(uri)}`, {
          method: 'POST',
          headers,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Handle response
    if (response.status === 204) {
      // No content - success
      return NextResponse.json({ success: true });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Spotify API error', details: errorData },
        { status: response.status }
      );
    }

    // Return response data (for state action)
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to execute playback action' },
      { status: 500 }
    );
  }
}

// GET: Get current playback state
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accessToken = searchParams.get('access_token');

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Missing access_token' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${SPOTIFY_API_URL}/me/player`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      // No active device
      return NextResponse.json({ is_playing: false, device: null });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Spotify API error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to get playback state' },
      { status: 500 }
    );
  }
}
