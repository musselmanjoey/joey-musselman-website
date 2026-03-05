"use client";

import { useEffect, useState } from "react";
import { fetchDailyGospel, type GospelReading } from "@/lib/daily/api";

export default function GospelSection() {
  const [gospel, setGospel] = useState<GospelReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchDailyGospel()
      .then(setGospel)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 rounded-lg border border-[var(--border)] animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    );
  }

  if (!gospel) return null;

  const paragraphs = gospel.text.split("\n").filter((p) => p.trim());
  const preview = paragraphs.slice(0, 3);
  const hasMore = paragraphs.length > 3;

  return (
    <div className="p-6 rounded-lg border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--accent)] text-lg">&#10013;</span>
        <h2 className="text-[var(--accent)] font-semibold text-sm uppercase tracking-wider">
          Daily Gospel
        </h2>
      </div>

      <p className="text-[var(--accent)] text-sm mb-4">{gospel.reference}</p>

      <div className="space-y-3 text-[var(--muted)] leading-relaxed">
        {(expanded ? paragraphs : preview).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-sm text-[var(--accent)] hover:opacity-80 transition-opacity"
        >
          {expanded ? "Show less" : "Read full passage \u2193"}
        </button>
      )}
    </div>
  );
}
