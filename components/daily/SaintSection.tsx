"use client";

import { useEffect, useState } from "react";
import saintsData from "../../data/daily/saints.json";

interface Saint {
  name: string;
  type: string;
  description: string;
  prayer: string;
}

export default function SaintSection() {
  const [saint, setSaint] = useState<Saint | null>(null);

  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const key = `${mm}-${dd}` as keyof typeof saintsData.saints;
    const todaySaint = saintsData.saints[key] as Saint | undefined;
    setSaint(todaySaint || null);
  }, []);

  if (!saint) return null;

  const typeColors: Record<string, string> = {
    solemnity: "bg-red-50 text-[var(--accent)]",
    feast: "bg-red-50/60 text-[var(--accent)]",
    memorial: "bg-gray-100 text-[var(--muted)]",
    "optional memorial": "bg-gray-50 text-[var(--muted)]",
  };

  return (
    <div className="p-6 rounded-lg border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--accent)] text-lg">&#9733;</span>
        <h2 className="text-[var(--accent)] font-semibold text-sm uppercase tracking-wider">
          Saint of the Day
        </h2>
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">{saint.name}</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${typeColors[saint.type] || "bg-gray-50 text-[var(--muted)]"}`}
        >
          {saint.type}
        </span>
      </div>

      <p className="text-[var(--muted)] leading-relaxed mb-4">{saint.description}</p>

      <div className="bg-gray-50 rounded-lg p-4 border-l-2 border-[var(--accent)]">
        <p className="text-[var(--muted)] text-sm italic">&ldquo;{saint.prayer}&rdquo;</p>
      </div>
    </div>
  );
}
