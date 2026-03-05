"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuoteSection from "@/components/daily/QuoteSection";
import BattleSection from "@/components/daily/BattleSection";
import GospelSection from "@/components/daily/GospelSection";
import SaintSection from "@/components/daily/SaintSection";
import ArtSection from "@/components/daily/ArtSection";
import { getToday } from "@/lib/daily/dates";

export default function DailyPage() {
  const [date, setDate] = useState<{
    dayOfWeek: string;
    month: string;
    day: number;
    year: number;
  } | null>(null);

  useEffect(() => {
    setDate(getToday());
  }, []);

  if (!date) return null;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <Link
        href="/"
        className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-8 inline-block"
      >
        &larr; Back
      </Link>

      <header className="mb-12 text-center">
        <p className="text-[var(--accent)] font-medium text-sm uppercase tracking-widest mb-1">
          {date.dayOfWeek}
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--foreground)]">
          {date.month} {date.day}
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1">{date.year}</p>
      </header>

      <div className="space-y-6">
        <QuoteSection />
        <BattleSection />
        <GospelSection />
        <SaintSection />
        <ArtSection />
      </div>

      <footer className="text-center mt-12 pt-8 border-t border-[var(--border)]">
        <p className="text-[var(--muted)] text-xs">Daily Feed</p>
      </footer>
    </main>
  );
}
