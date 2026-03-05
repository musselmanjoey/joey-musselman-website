"use client";

import { useEffect, useState, useCallback } from "react";
import quotesData from "../../data/daily/quotes.json";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

interface Quote {
  text: string;
  author: string;
  category: string;
}

function seededShuffle(arr: Quote[], seed: number): Quote[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getShuffledQuotes(): { quotes: Quote[]; startIndex: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const quotes = seededShuffle(quotesData.quotes, now.getFullYear());
  return { quotes, startIndex: dayOfYear % quotes.length };
}

export default function QuoteSection() {
  const [index, setIndex] = useState<number | null>(null);
  const [shuffled, setShuffled] = useState<Quote[]>([]);

  useEffect(() => {
    const { quotes: q, startIndex } = getShuffledQuotes();
    setShuffled(q);
    setIndex(startIndex);
  }, []);

  const nextQuote = useCallback(() => {
    setIndex((prev) => (prev !== null ? (prev + 1) % shuffled.length : 0));
  }, [shuffled.length]);

  const prevQuote = useCallback(() => {
    setIndex((prev) =>
      prev !== null ? (prev - 1 + shuffled.length) % shuffled.length : 0
    );
  }, [shuffled.length]);

  const { handleTouchStart, handleTouchEnd, handleClick } = useSwipeNavigation({
    onNext: nextQuote,
    onPrev: prevQuote,
  });

  if (index === null || shuffled.length === 0) return null;

  const quote: Quote = shuffled[index];

  return (
    <div
      className="p-6 rounded-lg border border-[var(--border)] cursor-pointer select-none active:scale-[0.98] transition-transform"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)] text-xl">&ldquo;</span>
          <h2 className="text-[var(--accent)] font-semibold text-sm uppercase tracking-wider">
            Quote of the Day
          </h2>
        </div>
        <span className="text-[var(--muted)] text-xs">tap / swipe</span>
      </div>
      <blockquote className="text-xl md:text-2xl font-light leading-relaxed text-[var(--foreground)] mb-4">
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      <div className="flex items-center justify-between">
        <p className="text-[var(--accent)] font-medium">
          &mdash; {quote.author}
        </p>
        <span className="text-xs text-[var(--muted)] uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-full">
          {quote.category}
        </span>
      </div>
    </div>
  );
}
