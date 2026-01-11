import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

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

    const supabase = getServiceClient();

    // Upsert commits - ON CONFLICT DO NOTHING (SHA is unique)
    const { data, error } = await supabase
      .from('commits')
      .upsert(
        commits.map(c => ({
          sha: c.sha,
          repo: c.repo,
          message: c.message,
          committed_at: c.committed_at,
          url: c.url || null,
        })),
        { onConflict: 'sha', ignoreDuplicates: true }
      )
      .select('sha');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
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

    const supabase = getServiceClient();

    let query = supabase
      .from('commits')
      .select('sha, repo, message, committed_at, url', { count: 'exact' })
      .order('committed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (repo) {
      query = query.eq('repo', repo);
    }
    if (since) {
      query = query.gte('committed_at', since);
    }
    if (until) {
      query = query.lte('committed_at', until);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      commits: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/commits error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch commits', details: message }, { status: 500 });
  }
}
