/**
 * Backfill historical commits from local git repos
 *
 * Usage:
 *   npx tsx scripts/backfill-commits.ts
 *
 * Options:
 *   --dry-run    Show what would be ingested without posting
 *   --since      Start date (default: 2024-07-01)
 *   --projects   Path to projects folder (default: C:\Users\musse\Projects)
 *
 * Requires UPDATE_SECRET in .env.local
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const GITHUB_USERNAME = 'musselmanjoey';
const DEFAULT_PROJECTS_PATH = 'C:\\Users\\musse\\Projects';
const DEFAULT_SINCE = '2024-07-01';
const API_URL = process.env.SITE_URL || 'http://localhost:3000';
const UPDATE_SECRET = process.env.UPDATE_SECRET;

// Additional directories to search for repos (subdirectories of projects path)
const ADDITIONAL_SEARCH_DIRS = ['MyWebsite', 'DndGenerator'];

async function fetchPublicRepos(): Promise<Set<string>> {
  console.log('Fetching public repos from GitHub...');
  const response = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=public`
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const repos = await response.json();
  const publicRepoNames = new Set<string>(
    repos.map((r: { full_name: string }) => r.full_name.toLowerCase())
  );

  console.log(`Found ${publicRepoNames.size} public repos: ${[...publicRepoNames].map(r => r.split('/')[1]).join(', ')}\n`);
  return publicRepoNames;
}

interface Commit {
  sha: string;
  repo: string;
  message: string;
  committed_at: string;
  url: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    since: args.find(a => a.startsWith('--since='))?.split('=')[1] || DEFAULT_SINCE,
    projectsPath: args.find(a => a.startsWith('--projects='))?.split('=')[1] || DEFAULT_PROJECTS_PATH,
  };
}

function getGitRemote(repoPath: string): string | null {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return remote;
  } catch {
    return null;
  }
}

function extractRepoName(remoteUrl: string): string | null {
  // Handle both SSH and HTTPS formats
  // git@github.com:musselmanjoey/RepoName.git
  // https://github.com/musselmanjoey/RepoName.git
  const patterns = [
    /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/,
  ];

  for (const pattern of patterns) {
    const match = remoteUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function getCommits(repoPath: string, repoName: string, since: string): Commit[] {
  const commits: Commit[] = [];

  try {
    // Git log format: SHA|ISO date|Subject (first line only)
    // Using %s for subject to avoid multiline issues
    const format = '%H|%aI|%s';
    const output = execSync(
      `git log --since="${since}" --format="${format}" --no-merges`,
      {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    ).trim();

    if (!output) return commits;

    for (const line of output.split('\n')) {
      const [sha, committed_at, ...messageParts] = line.split('|');
      const message = messageParts.join('|'); // In case message contains |

      if (sha && committed_at && message) {
        commits.push({
          sha,
          repo: repoName,
          message,
          committed_at,
          url: `https://github.com/${repoName}/commit/${sha}`,
        });
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  Error getting commits: ${msg}`);
  }

  return commits;
}

async function ingestCommits(commits: Commit[], dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`\n[DRY RUN] Would ingest ${commits.length} commits`);
    console.log('Sample commits:');
    commits.slice(0, 5).forEach(c => {
      console.log(`  ${c.sha.slice(0, 7)} | ${c.repo} | ${c.committed_at.slice(0, 10)} | ${c.message.slice(0, 50)}`);
    });
    return;
  }

  if (!UPDATE_SECRET) {
    console.error('ERROR: UPDATE_SECRET not found in environment');
    process.exit(1);
  }

  // Batch commits in groups of 100
  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < commits.length; i += batchSize) {
    const batch = commits.slice(i, i + batchSize);
    console.log(`Ingesting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commits.length / batchSize)} (${batch.length} commits)...`);

    const response = await fetch(`${API_URL}/api/commits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UPDATE_SECRET}`,
      },
      body: JSON.stringify({ commits: batch }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to ingest batch: ${response.status} ${error}`);
      continue;
    }

    const result = await response.json();
    totalInserted += result.inserted || 0;
    console.log(`  Inserted: ${result.inserted}/${batch.length}`);
  }

  console.log(`\nTotal inserted: ${totalInserted}/${commits.length}`);
}

function findReposInDirectory(dirPath: string): { repoPath: string; repoName: string }[] {
  const repos: { repoPath: string; repoName: string }[] = [];

  if (!fs.existsSync(dirPath)) return repos;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const repoPath = path.join(dirPath, entry.name);
    const gitDir = path.join(repoPath, '.git');

    if (!fs.existsSync(gitDir)) continue;

    const remote = getGitRemote(repoPath);
    if (!remote) continue;

    const repoName = extractRepoName(remote);
    if (!repoName) continue;

    repos.push({ repoPath, repoName });
  }

  return repos;
}

async function main() {
  const { dryRun, since, projectsPath } = parseArgs();

  console.log('=== Commit Backfill Script ===');
  console.log(`Projects path: ${projectsPath}`);
  console.log(`Since: ${since}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`API URL: ${API_URL}`);
  console.log('');

  if (!fs.existsSync(projectsPath)) {
    console.error(`ERROR: Projects path does not exist: ${projectsPath}`);
    process.exit(1);
  }

  // Fetch public repos from GitHub first
  const publicRepos = await fetchPublicRepos();

  // Find all local repos
  const allLocalRepos: { repoPath: string; repoName: string }[] = [];

  // Search main projects directory
  allLocalRepos.push(...findReposInDirectory(projectsPath));

  // Search additional directories (like MyWebsite subdirectories)
  for (const subdir of ADDITIONAL_SEARCH_DIRS) {
    const subdirPath = path.join(projectsPath, subdir);
    allLocalRepos.push(...findReposInDirectory(subdirPath));
  }

  const allCommits: Commit[] = [];

  for (const { repoPath, repoName } of allLocalRepos) {
    const repoNameLower = repoName.toLowerCase();

    // Only include repos owned by the target user
    if (!repoNameLower.startsWith(GITHUB_USERNAME.toLowerCase() + '/')) {
      continue;
    }

    // Only include PUBLIC repos
    if (!publicRepos.has(repoNameLower)) {
      console.log(`Skipping ${repoName} (private)`);
      continue;
    }

    console.log(`Processing ${repoName}...`);
    const commits = getCommits(repoPath, repoName, since);
    console.log(`  Found ${commits.length} commits`);
    allCommits.push(...commits);
  }

  console.log(`\nTotal commits found: ${allCommits.length}`);

  if (allCommits.length === 0) {
    console.log('No commits to ingest');
    return;
  }

  // Sort by date (newest first)
  allCommits.sort((a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime());

  await ingestCommits(allCommits, dryRun);
}

main().catch(console.error);
