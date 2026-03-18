import Link from 'next/link';
import { ActivityFeed } from '@/components/ActivityFeed';
import { getPool } from '@/lib/db';

// Revalidate page every 5 minutes to pick up new commits
export const revalidate = 300;

interface CommitRecord {
  sha: string;
  repo: string;
  message: string;
  committed_at: Date | string;
  url: string | null;
}

interface ActivityItem {
  repo: string;
  date: string;
  commits: { message: string; sha: string; url?: string }[];
}

async function getActivity(): Promise<{ activity: ActivityItem[]; updated_at: string | null }> {
  // Skip if database not configured (dev without env vars)
  if (!process.env.RAILWAY_DATABASE_PUBLIC_URL) {
    return { activity: [], updated_at: null };
  }

  try {
    const pool = getPool();

    // Fetch recent commits
    const result = await pool.query(
      `SELECT sha, repo, message, committed_at, url
       FROM commits
       ORDER BY committed_at DESC
       LIMIT 50`
    );

    const commits = result.rows as CommitRecord[];

    if (commits.length === 0) {
      return { activity: [], updated_at: null };
    }

    // Group commits by repo + date for display
    const grouped = new Map<string, ActivityItem>();

    for (const commit of commits) {
      // committed_at is a Date object from pg, convert to ISO string
      const committedAt = commit.committed_at instanceof Date
        ? commit.committed_at.toISOString()
        : commit.committed_at;
      const date = committedAt.split('T')[0]; // YYYY-MM-DD
      const key = `${commit.repo}|${date}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          repo: commit.repo,
          date: committedAt,
          commits: [],
        });
      }

      grouped.get(key)!.commits.push({
        message: commit.message,
        sha: commit.sha,
        url: commit.url || undefined,
      });
    }

    // Convert to array and take top entries
    const activity = Array.from(grouped.values()).slice(0, 10);
    const latestCommit = commits[0];
    const latestCommitDate = latestCommit?.committed_at instanceof Date
      ? latestCommit.committed_at.toISOString()
      : latestCommit?.committed_at || null;

    return {
      activity,
      updated_at: latestCommitDate,
    };
  } catch {
    return { activity: [], updated_at: null };
  }
}

export default async function Home() {
  const { activity, updated_at } = await getActivity();
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      {/* Hero */}
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Joey Musselman</h1>
        <p className="text-[var(--muted)] text-lg mb-6">
          Software Engineer · Building with AI
        </p>
        <div className="flex gap-4 text-sm">
          <a
            href="https://github.com/musselmanjoey"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/joseph-musselman/"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline"
          >
            LinkedIn
          </a>
        </div>
      </section>

      {/* About */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <div className="space-y-4 text-[var(--muted)]">
          <p>
            I&apos;m a software engineer based in Charlotte, NC. I build full-stack applications
            and AI-powered tools with Python, React, and whatever gets the job done.
            Most of my recent work involves finding ways to make AI actually useful.
          </p>
        </div>
      </section>

      {/* Activity Feed */}
      <ActivityFeed activity={activity} updatedAt={updated_at} />

      {/* Projects */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Link href="/projects" className="text-sm link-underline text-[var(--muted)]">
            View all →
          </Link>
        </div>
        <div className="space-y-6">
          <ProjectCard
            title="EstiMate"
            description="Custom B2B estimation tool for a 500+ employee warehouse contractor. Cut estimation time 50% with template-driven workflows, real-time calculations, and multi-stage approval pipeline."
            tech={['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma']}
            link="/projects/estimate"
            featured
          />
          <ProjectCard
            title="Circus Archives"
            description="Production video archive for FSU circus alumni with 2GB browser uploads, automated YouTube publishing via GitHub Actions, and weighted community voting. Live with real users."
            tech={['Next.js', 'TypeScript', 'PostgreSQL', 'Vercel Blob', 'GitHub Actions']}
            link="/projects/circus-archives"
            featured
          />
          <ProjectCard
            title="Swaddle"
            description="MCP server connecting Claude Desktop to Spotify for natural language playlist curation. One of 30+ production MCP tools I've built, with OAuth 2.0, PostgreSQL caching, and 13 audio feature metrics per track."
            tech={['Node.js', 'MCP SDK', 'Spotify API', 'PostgreSQL', 'OAuth 2.0']}
            link="/projects/swaddle"
          />
          <ProjectCard
            title="PodcastAI"
            description="Fully automated podcast pipeline — send a topic via Telegram and get a complete episode with AI research, dual-host script, synthesized audio, transcription, and RSS publishing."
            tech={['TypeScript', 'Claude CLI', 'Kokoro TTS', 'WhisperX', 'Cloudflare R2']}
            link="/projects/podcast-ai"
          />
          <ProjectCard
            title="GameSense"
            description="Beach volleyball intelligence platform with automated FIVB data scraping, 12-table PostgreSQL schema, and live match tracking with point-by-point court zone visualization."
            tech={['Next.js', 'TypeScript', 'PostgreSQL', 'Playwright']}
            link="/projects/game-sense"
          />
          <ProjectCard
            title="Pallet"
            description="Smart meal planner with live Kroger API integration, 5-factor recommendation engine weighing seasonality and sales, and direct Harris Teeter cart additions."
            tech={['Next.js', 'TypeScript', 'Kroger API', 'Supabase', 'PostgreSQL']}
            link="/projects/pallet"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">
          &copy; {new Date().getFullYear()} Joey Musselman
        </p>
      </footer>
    </main>
  );
}

function ProjectCard({
  title,
  description,
  tech,
  link,
  featured
}: {
  title: string;
  description: string;
  tech: string[];
  link?: string;
  featured?: boolean;
}) {
  const content = (
    <div className="group p-4 -mx-4 rounded-lg card-hover hover:bg-gray-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium group-hover:text-[var(--accent)] transition-colors">
            {title}
          </h3>
          {featured && (
            <span className="text-xs px-2 py-0.5 bg-[var(--accent)] text-white rounded">
              Featured
            </span>
          )}
        </div>
        {link && (
          <svg
            className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </div>
      <p className="text-sm text-[var(--muted)] mb-3">{description}</p>
      <div className="flex flex-wrap gap-2">
        {tech.map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-1 bg-gray-100 text-[var(--muted)] rounded"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );

  if (link) {
    const isExternal = link.startsWith('http');
    if (isExternal) {
      return (
        <a href={link} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
