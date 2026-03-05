"use client";

import { useEffect, useState } from "react";
import { fetchFeaturedArt, type Artwork } from "@/lib/daily/api";

export default function ArtSection() {
  const [art, setArt] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedArt()
      .then(setArt)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 rounded-lg border border-[var(--border)] animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-64 bg-gray-100 rounded-lg mb-3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    );
  }

  if (!art) return null;

  return (
    <div className="p-6 rounded-lg border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--accent)] text-lg">&#127912;</span>
        <h2 className="text-[var(--accent)] font-semibold text-sm uppercase tracking-wider">
          Featured Art
        </h2>
      </div>

      <div className="mb-4 rounded-lg overflow-hidden bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art.imageUrl}
          alt={art.altText}
          className="w-full object-contain max-h-96"
          loading="lazy"
        />
      </div>

      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
        {art.title}
      </h3>
      <p className="text-[var(--accent)] text-sm">{art.artist}</p>
      <p className="text-[var(--muted)] text-xs mt-1">{art.date}</p>
    </div>
  );
}
