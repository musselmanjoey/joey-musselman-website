import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

interface EpisodePayload {
  id: string;
  title: string;
  description?: string;
  audio_url: string;
  duration: number;
  file_size?: number;
  episode_number?: number;
  season?: number;
  published_at: string;
  ai_generated?: boolean;
  ai_disclosure?: string;
  episode_type?: string;
}

// POST: Ingest episodes from Somman (batch upsert)
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.UPDATE_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { episodes }: { episodes: EpisodePayload[] } = await request.json();

    if (!Array.isArray(episodes) || episodes.length === 0) {
      return NextResponse.json({ error: 'No episodes provided' }, { status: 400 });
    }

    const pool = getPool();

    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS podcast_episodes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        audio_url TEXT NOT NULL,
        duration INTEGER NOT NULL,
        file_size INTEGER,
        episode_number INTEGER,
        season INTEGER DEFAULT 1,
        published_at TIMESTAMPTZ NOT NULL,
        ai_generated BOOLEAN DEFAULT true,
        ai_disclosure TEXT,
        episode_type TEXT DEFAULT 'full',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add episode_type column if missing (for existing tables)
    await pool.query(`
      ALTER TABLE podcast_episodes ADD COLUMN IF NOT EXISTS episode_type TEXT DEFAULT 'full'
    `);

    // Batch upsert
    const values: (string | number | boolean | null)[] = [];
    const placeholders: string[] = [];

    episodes.forEach((ep, i) => {
      const offset = i * 12;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
      );
      values.push(
        ep.id,
        ep.title,
        ep.description || null,
        ep.audio_url,
        ep.duration,
        ep.file_size || null,
        ep.episode_number || null,
        ep.season || 1,
        ep.published_at,
        ep.ai_generated ?? true,
        ep.ai_disclosure || null,
        ep.episode_type || 'full',
      );
    });

    const query = `
      INSERT INTO podcast_episodes (id, title, description, audio_url, duration, file_size, episode_number, season, published_at, ai_generated, ai_disclosure, episode_type)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        audio_url = EXCLUDED.audio_url,
        duration = EXCLUDED.duration,
        file_size = EXCLUDED.file_size,
        episode_number = EXCLUDED.episode_number,
        season = EXCLUDED.season,
        published_at = EXCLUDED.published_at,
        ai_generated = EXCLUDED.ai_generated,
        ai_disclosure = EXCLUDED.ai_disclosure,
        episode_type = EXCLUDED.episode_type
      RETURNING id
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      inserted: result.rowCount || 0,
      total: episodes.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to ingest episodes', details: message }, { status: 500 });
  }
}

// GET: Fetch published episodes (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const pool = getPool();

    const countResult = await pool.query('SELECT COUNT(*) FROM podcast_episodes');
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT id, title, description, audio_url, duration, file_size, episode_number, season, published_at, ai_generated, ai_disclosure, created_at
       FROM podcast_episodes
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      episodes: dataResult.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch episodes', details: message }, { status: 500 });
  }
}
