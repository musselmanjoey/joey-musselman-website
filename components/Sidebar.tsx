'use client';

import { useState } from 'react';
import { blogPosts } from '@/data/posts';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  // Get unique years for archives
  const archives = Array.from(new Set(blogPosts.map(post => {
    const date = new Date(post.date);
    return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
  }))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 bg-circus-red text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Close' : 'Menu'}
      </button>

      {/* Sidebar */}
      <aside className={`
        sidebar fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-40 overflow-y-auto
        transition-transform duration-300 ease-in-out
        md:translate-x-0 md:top-64 md:left-0 md:w-[300px] lg:w-[350px] md:h-[calc(100vh-16rem)]
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="widget-area p-6 md:p-8 space-y-6">
          {/* Search Widget */}
          <div className="widget">
            <form role="search" className="search-form">
              <input
                type="search"
                className="search-field w-full px-4 py-2.5 border border-gray-200 focus:border-circus-red focus:ring-2 focus:ring-circus-red/20 rounded-lg transition-all"
                placeholder="Search..."
                name="s"
              />
            </form>
          </div>

          {/* Recent Posts Widget */}
          <div className="widget">
            <h2 className="widget-title text-lg font-bold text-gray-900 mb-4">Recent Posts</h2>
            <ul className="space-y-3">
              {blogPosts.slice(0, 5).map(post => (
                <li key={post.id}>
                  <a
                    href={`/${post.slug}`}
                    className="text-gray-700 hover:text-circus-red block text-sm leading-snug transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {post.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Archives Widget */}
          <div className="widget">
            <h2 className="widget-title text-lg font-bold text-gray-900 mb-4">Archives</h2>
            <ul className="space-y-2">
              {archives.map((archive, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-700 hover:text-circus-red text-sm transition-colors">
                    {archive}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories Widget */}
          <div className="widget">
            <h2 className="widget-title text-lg font-bold text-gray-900 mb-4">Categories</h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-700 hover:text-circus-red text-sm transition-colors">
                  Circus Performances
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
