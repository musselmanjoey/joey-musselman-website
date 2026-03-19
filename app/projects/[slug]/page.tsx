import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/lib/projects/data";
import type { Metadata } from "next";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return { title: "Project Not Found" };
  const title = `${project.title} | Joey Musselman`;
  return {
    title,
    description: project.intro,
    openGraph: {
      title,
      description: project.intro,
      type: "article",
      siteName: "Joey Musselman",
      url: `https://joeymusselman.com/projects/${project.slug}`,
      authors: ["Joey Musselman"],
      publishedTime: project.date,
    },
    twitter: {
      card: "summary",
      title,
      description: project.intro,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projectIndex = projects.findIndex((p) => p.slug === slug);
  const project = projects[projectIndex];

  if (!project) notFound();

  const prevProject = projectIndex > 0 ? projects[projectIndex - 1] : null;
  const nextProject =
    projectIndex < projects.length - 1 ? projects[projectIndex + 1] : null;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <div className="mb-8">
        <Link
          href="/projects"
          className="text-sm link-underline text-[var(--muted)]"
        >
          ← Projects
        </Link>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold mb-2">{project.title}</h1>
      <p className="text-[var(--muted)] text-sm mb-8">
        Joey Musselman · {new Date(project.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      {/* Intro */}
      <p className="text-[var(--muted)] mb-10 leading-relaxed">
        {project.intro}
      </p>

      {/* Challenge */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Challenge</h2>
        <p className="text-[var(--muted)] leading-relaxed">
          {project.challenge}
        </p>
      </section>

      {/* My Role & Contribution */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">My Role & Contribution</h2>
        <p className="text-sm text-[var(--muted)] mb-4 italic">
          {project.role}
        </p>
        <ul className="space-y-3">
          {project.contributions.map((item, i) => (
            <li
              key={i}
              className="text-[var(--muted)] pl-4 border-l-2 border-[var(--accent)] leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Key Technologies */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Key Technologies</h2>
        <div className="flex flex-wrap gap-2">
          {project.technologies.map((t) => (
            <span
              key={t}
              className="text-sm px-3 py-1 bg-gray-100 text-[var(--muted)] rounded"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Impact & Scale */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Impact</h2>
        <p className="text-[var(--muted)] leading-relaxed">{project.impact}</p>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm link-accent font-medium"
          >
            View live →
          </a>
        )}
      </section>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-12">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 bg-gray-50 text-[var(--muted)] rounded border border-[var(--border)]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Prev/Next Navigation */}
      <nav className="flex justify-between pt-8 border-t border-[var(--border)]">
        {prevProject ? (
          <Link
            href={`/projects/${prevProject.slug}`}
            className="text-sm link-underline"
          >
            ← {prevProject.title.split(":")[0]}
          </Link>
        ) : (
          <span />
        )}
        {nextProject ? (
          <Link
            href={`/projects/${nextProject.slug}`}
            className="text-sm link-underline text-right"
          >
            {nextProject.title.split(":")[0]} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
