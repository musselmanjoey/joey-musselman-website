-- Historical commits table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS commits (
  id SERIAL PRIMARY KEY,
  sha VARCHAR(40) UNIQUE NOT NULL,
  repo VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_commits_committed_at ON commits(committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo);

-- Composite index for date range + repo queries
CREATE INDEX IF NOT EXISTS idx_commits_repo_date ON commits(repo, committed_at DESC);

-- Grant access (adjust based on your RLS setup)
-- If using service role key, no RLS needed
-- ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service role full access" ON commits FOR ALL USING (true);
