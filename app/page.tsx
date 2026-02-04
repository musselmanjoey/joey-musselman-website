import Link from 'next/link';
import { ActivityFeed } from '@/components/ActivityFeed';
import { getPool } from '@/lib/db';

// Revalidate page every 5 minutes to pick up new commits
export const revalidate = 300;

interface CommitRecord {
  sha: string;
  repo: string;
  message: string;
  committed_at: string;
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
        <h2 className="text-xl font-semibold mb-6">Projects</h2>
        <div className="space-y-6">
          <ProjectCard
            title="Circus Video Archive"
            description="Full-stack video archive serving FSU circus alumni with 2GB browser uploads, weighted community voting, and a hybrid YouTube upload pipeline. Live in production with real users."
            tech={['Next.js 15', 'TypeScript', 'PostgreSQL', 'Prisma', 'Vercel Blob', 'Tailwind CSS']}
            link="https://flyinghighcircusarchives.com"
            featured
          />
          <ProjectCard
            title="MagicHelper"
            description="Python toolkit that parses MTG Arena logs to track card collections and validate decks, with 30+ MCP tools enabling AI-assisted deck building through Claude Desktop integration."
            tech={['Python', 'SQLite', 'MCP', 'Scryfall API', 'AsyncIO']}
            featured
          />
          <ProjectCard
            title="Swaddle"
            description="MCP server that connects Claude Desktop to Spotify, enabling natural language playlist curation. Search your music library, discover tracks, and create playlists through conversation - backed by PostgreSQL cache with audio feature analysis."
            tech={['Python', 'MCP', 'Spotify API', 'PostgreSQL', 'OAuth 2.0']}
          />
          <ProjectCard
            title="OpTracker"
            description="Real-time volleyball match tracking app with AI-powered analytics. Features a desktop UI for live game statistics capture and an MCP server enabling natural language queries to match data through Claude Desktop."
            tech={['Python', 'PostgreSQL', 'SQLAlchemy 2.0', 'MCP', 'Docker', 'Tkinter']}
          />
          <ProjectCard
            title="Finance"
            description="Privacy-first desktop app that detects forgotten subscriptions from bank statements using local AI. Categorizes transactions with Llama 3.1, identifies recurring charges with risk scoring - all running locally with no cloud dependencies."
            tech={['Python', 'Ollama', 'PostgreSQL', 'Tkinter', 'pandas']}
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
    return (
      <a href={link} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}
