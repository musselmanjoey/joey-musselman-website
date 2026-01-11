import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

interface Commit {
  message: string;
  sha: string;
}

interface ActivityItem {
  repo: string;
  date: string;
  commits: Commit[];
}

interface UpdatePayload {
  activity: ActivityItem[];
  updated_at: string;
}

export async function POST(request: Request) {
  // Verify auth token
  const authHeader = request.headers.get('Authorization');
  const expectedToken = process.env.UPDATE_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload: UpdatePayload = await request.json();
    const supabase = getServiceClient();

    // Update the single row (upsert in case table is empty)
    const { error } = await supabase
      .from('daily_activity')
      .upsert({
        id: 1,
        activity: payload.activity,
        updated_at: payload.updated_at
      });

    if (error) throw error;

    return NextResponse.json({ success: true, updated_at: payload.updated_at });
  } catch (error) {
    console.error('Failed to save activity:', error);
    return NextResponse.json({ error: 'Failed to save activity' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('daily_activity')
      .select('activity, updated_at')
      .eq('id', 1)
      .single();

    if (error) throw error;

    return NextResponse.json({
      activity: data?.activity || [],
      updated_at: data?.updated_at || null
    });
  } catch {
    return NextResponse.json({ activity: [], updated_at: null });
  }
}
