import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

interface CommitPayload {
  sha: string;
  repo: string;
  message: string;
  committed_at: string;
  url?: string;
}

// POST: Ingest commits (batch insert with upsert)
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.UPDATE_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { commits }: { commits: CommitPayload[] } = await request.json();

    if (!Array.isArray(commits) || commits.length === 0) {
      return NextResponse.json({ error: 'No commits provided' }, { status: 400 });
    }

    const pool = getPool();

    // Upsert commits - ON CONFLICT DO NOTHING (SHA is unique)
    const values: (string | null)[] = [];
    const placeholders: string[] = [];

    commits.forEach((c, i) => {
      const offset = i * 5;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
      values.push(c.sha, c.repo, c.message, c.committed_at, c.url || null);
    });

    const query = `
      INSERT INTO commits (sha, repo, message, committed_at, url)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (sha) DO NOTHING
      RETURNING sha
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      inserted: result.rowCount || 0,
      total: commits.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to ingest commits', details: message }, { status: 500 });
  }
}

// GET: Fetch historical commits with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const repo = searchParams.get('repo');
    const since = searchParams.get('since'); // ISO date string
    const until = searchParams.get('until'); // ISO date string

    const pool = getPool();

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (repo) {
      conditions.push(`repo = $${paramIndex++}`);
      params.push(repo);
    }
    if (since) {
      conditions.push(`committed_at >= $${paramIndex++}`);
      params.push(since);
    }
    if (until) {
      conditions.push(`committed_at <= $${paramIndex++}`);
      params.push(until);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM commits ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get data
    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT sha, repo, message, committed_at, url
       FROM commits
       ${whereClause}
       ORDER BY committed_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return NextResponse.json({
      commits: dataResult.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch commits', details: message }, { status: 500 });
  }
}
