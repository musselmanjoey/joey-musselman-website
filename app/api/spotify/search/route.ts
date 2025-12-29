import { NextResponse } from 'next/server';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const accessToken = searchParams.get('access_token');
  const limit = searchParams.get('limit') || '10';

  if (!query) {
    return NextResponse.json(
      { error: 'Missing search query (q)' },
      { status: 400 }
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Missing access_token' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Spotify API error', details: errorData },
        { status: response.status }
      );
    }

    const data: SpotifySearchResponse = await response.json();

    // Format tracks for client consumption
    const tracks = data.tracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      uri: track.uri,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || null,
      duration: track.duration_ms,
    }));

    return NextResponse.json({
      tracks,
      total: data.tracks.total,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to search Spotify' },
      { status: 500 }
    );
  }
}
