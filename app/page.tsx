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
            description="Community platform preserving FSU Flying High Circus performance history. Features video uploads, performer tagging, voting system, and comment threads."
            tech={['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'NextAuth']}
            link="https://flyinghighcircusarchives.com"
          />
          <ProjectCard
            title="MagicHelper"
            description="MTG Arena collection manager and deck building assistant. Parses Arena log files to build a local database, enabling intelligent deck recommendations."
            tech={['Python', 'SQLite', 'MCP Server']}
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
  link
}: {
  title: string;
  description: string;
  tech: string[];
  link?: string;
}) {
  const content = (
    <div className="group p-4 -mx-4 rounded-lg card-hover hover:bg-gray-50">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium group-hover:text-[var(--accent)] transition-colors">
          {title}
        </h3>
        {link && (
          <svg
            className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors"
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
