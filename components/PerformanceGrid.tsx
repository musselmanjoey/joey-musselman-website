'use client';

import { useState } from 'react';
import Link from 'next/link';
import { blogPosts } from '@/data/posts';

export default function PerformanceGrid() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', '2018', '2017', '2015'];

  const filteredPosts = selectedCategory === 'all'
    ? blogPosts
    : blogPosts.filter(post => post.date.includes(selectedCategory));

  return (
    <section id="latest" className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">Performances</span>
          </h2>
          <p className="text-xl text-white/60">
            Witness the artistry and athleticism
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-circus-red to-orange-500 text-white glow'
                  : 'glass hover:glass-strong text-white/70 hover:text-white'
              }`}
            >
              {category === 'all' ? 'All Shows' : category}
            </button>
          ))}
        </div>

        {/* Bento Grid of Performances */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, index) => (
            <Link
              key={post.id}
              href={`/${post.slug}`}
              className={`group glass-strong rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-500 glow-hover ${
                index === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
              style={{
                animation: 'fadeInUp 0.6s ease-out',
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both',
              }}
            >
              {/* Image/Video Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                {post.videos && post.videos.length > 0 && (
                  <div
                    className="relative w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{
                      backgroundImage: `url(https://img.youtube.com/vi/${post.videos[0]}/maxresdefault.jpg)`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-circus-red rounded-full flex items-center justify-center group-hover:scale-110 transition-transform glow">
                        <svg className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Video Count Badge */}
                    {post.videos.length > 1 && (
                      <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full text-sm font-medium">
                        {post.videos.length} videos
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-sm text-circus-red font-medium mb-2">
                  {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-white group-hover:gradient-text transition-all">
                  {post.title}
                </h3>
                <p className="text-white/60 line-clamp-2">
                  {post.content.split('\n\n')[0]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
