import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      {/* Hero */}
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Joey Musselman</h1>
        <p className="text-[var(--muted)] text-lg mb-6">
          Software Engineer at Retirement Clearing House
        </p>
        <div className="flex gap-4 text-sm">
          <a
            href="https://github.com/joeymusselman"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/joseph-musselman"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline"
          >
            LinkedIn
          </a>
          <a
            href="mailto:musselmanjoey@gmail.com"
            className="link-underline"
          >
            Email
          </a>
        </div>
      </section>

      {/* About */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <div className="space-y-4 text-[var(--muted)]">
          <p>
            I&apos;m a software engineer based in Charlotte, NC. I build full-stack applications
            with .NET, React, Blazor, and Python. Currently working on fintech systems
            that help people manage their retirement savings.
          </p>
          <p>
            Before tech, I was Head Rigger for the{' '}
            <a
              href="https://flyinghighcircusarchives.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--foreground)] link-underline"
            >
              FSU Flying High Circus
            </a>
            —rigging trapeze, juggling, and performing in front of thousands.
            The precision and teamwork from circus still shapes how I approach engineering.
          </p>
        </div>
      </section>

      {/* Projects */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-6">Projects</h2>
        <div className="space-y-6">
          <ProjectCard
            title="Circus Archives"
            description="Community platform preserving FSU Flying High Circus performance history. Features video uploads, performer tagging, a voting system with performer bonuses, and threaded comments."
            tech={['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'NextAuth']}
            link="https://flyinghighcircusarchives.com"
            featured
          />
          <ProjectCard
            title="Swaddle"
            description="AI-powered Spotify playlist curator that transforms music curation into natural language conversation. Analyzes your library's audio features and lyrics sentiment, then integrates with Claude Desktop via MCP to create perfectly curated playlists."
            tech={['React', 'Electron', 'PostgreSQL', 'Spotify API', 'MCP']}
            featured
          />
          <ProjectCard
            title="OpTracker"
            description="Production-grade volleyball analytics platform that extracts detailed player statistics from FIVB Beach Pro Tour matches with 100% accuracy using Playwright automation. Features multiple interfaces including a real-time match tracker with court visualization."
            tech={['Python', 'Playwright', 'PostgreSQL', 'SQLAlchemy', 'MCP']}
            featured
          />
          <ProjectCard
            title="MagicHelper"
            description="MTG Arena collection manager and deck building assistant that parses Arena log files to build a local SQLite database. Integrates with Claude Desktop via MCP server for intelligent deck recommendations and game state analysis."
            tech={['Python', 'SQLite', 'MCP']}
          />
          <ProjectCard
            title="Finance"
            description="Privacy-first subscription detection tool that replicates Rocket Money functionality without cloud dependencies. Parses bank statements, uses local Ollama AI for transaction categorization, and identifies forgotten subscriptions with risk scoring."
            tech={['Python', 'PostgreSQL', 'Ollama', 'Pandas', 'Tkinter']}
          />
          <ProjectCard
            title="Transcriber"
            description="Desktop application for converting video and audio recordings into searchable text transcripts using OpenAI Whisper. Features batch processing, multiple accuracy levels, and real-time progress tracking."
            tech={['Python', 'OpenAI Whisper', 'FFmpeg', 'Tkinter']}
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
