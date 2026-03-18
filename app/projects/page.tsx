import Link from "next/link";
import { projects } from "@/lib/projects/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | Joey Musselman",
  description:
    "Portfolio of AI integration, MCP server, and full-stack web development projects.",
};

export default function ProjectsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <div className="mb-4">
        <Link href="/" className="text-sm link-underline text-[var(--muted)]">
          ← Home
        </Link>
      </div>

      <h1 className="text-4xl font-bold mb-2">Projects</h1>
      <p className="text-[var(--muted)] mb-12">
        AI integrations, MCP servers, and full-stack applications.
      </p>

      <div className="space-y-8">
        {projects.map((project) => (
          <Link key={project.slug} href={`/projects/${project.slug}`}>
            <article className="group p-4 -mx-4 rounded-lg card-hover hover:bg-gray-50">
              <div className="flex items-start justify-between mb-1">
                <h2 className="font-medium group-hover:text-[var(--accent)] transition-colors">
                  {project.title}
                </h2>
                <svg
                  className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-[var(--muted)] mb-3">
                {project.subtitle}
              </p>
              <div className="flex flex-wrap gap-2">
                {project.technologies.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-1 bg-gray-100 text-[var(--muted)] rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          </Link>
        ))}
      </div>

      <footer className="pt-8 mt-16 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">
          &copy; {new Date().getFullYear()} Joey Musselman
        </p>
      </footer>
    </main>
  );
}
