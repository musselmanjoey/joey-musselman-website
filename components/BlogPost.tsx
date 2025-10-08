'use client';

import { BlogPost as BlogPostType } from '@/data/posts';
import Link from 'next/link';
import { useState } from 'react';

interface BlogPostProps {
  post: BlogPostType;
  isExcerpt?: boolean;
}

export default function BlogPost({ post, isExcerpt = false }: BlogPostProps) {
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const loadVideo = (index: number) => {
    setLoadedVideos(prev => new Set([...prev, index]));
  };

  return (
    <article className="post mb-12 pb-12 border-b border-gray-100 last:border-0">
      <header className="entry-header mb-6">
        <h2 className="entry-title text-3xl md:text-4xl font-bold mb-3 text-gray-900">
          {isExcerpt ? (
            <Link href={`/${post.slug}`} className="hover:text-circus-red transition-colors">
              {post.title}
            </Link>
          ) : (
            post.title
          )}
        </h2>
        <time className="text-sm text-gray-500">{formatDate(post.date)}</time>
      </header>

      <div className="entry-content space-y-6">
        {post.content.split('\n\n').map((paragraph, index) => (
          paragraph.trim() && <p key={index} className="text-gray-700 leading-relaxed">{paragraph}</p>
        ))}

        {/* Images */}
        {post.images && post.images.map((image, index) => (
          <div key={index} className="my-8 rounded-lg overflow-hidden shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-auto"
            />
          </div>
        ))}

        {/* YouTube Videos - Lazy load */}
        {post.videos && (
          <div className="space-y-6">
            {post.videos.map((videoId, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden shadow-lg bg-gray-900" style={{ paddingBottom: '56.25%' }}>
                {!loadedVideos.has(index) ? (
                  <button
                    onClick={() => loadVideo(index)}
                    className="absolute inset-0 w-full h-full bg-cover bg-center group cursor-pointer"
                    style={{ backgroundImage: `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)` }}
                  >
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors">
                        <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                ) : (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isExcerpt && (
        <footer className="entry-footer mt-6">
          <Link
            href={`/${post.slug}`}
            className="inline-block text-circus-red hover:text-red-700 font-medium transition-colors"
          >
            Read more →
          </Link>
        </footer>
      )}
    </article>
  );
}
