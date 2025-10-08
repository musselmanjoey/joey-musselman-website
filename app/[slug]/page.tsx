import { blogPosts } from '@/data/posts';
import VideoGallery from '@/components/VideoGallery';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <article className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </a>

          <div className="inline-block glass px-4 py-2 rounded-full text-sm font-medium text-circus-red mb-6">
            {formatDate(post.date)}
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">{post.title}</span>
          </h1>

          {post.videos && (
            <p className="text-xl text-white/60">
              {post.videos.length} performance{post.videos.length !== 1 ? 's' : ''} • {formatDate(post.date).split(',')[1]}
            </p>
          )}
        </header>

        {/* Content */}
        <div className="glass-strong rounded-3xl p-8 md:p-12 mb-12">
          <div className="prose prose-invert prose-lg max-w-none">
            {post.content.split('\n\n').map((paragraph, index) => (
              paragraph.trim() && (
                <p key={index} className="text-white/80 leading-relaxed mb-6 last:mb-0">
                  {paragraph}
                </p>
              )
            ))}
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="mt-12 space-y-6">
              {post.images.map((image, index) => (
                <div key={index} className="rounded-2xl overflow-hidden glow-hover">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Gallery */}
        {post.videos && post.videos.length > 0 && (
          <div className="mb-12">
            <VideoGallery videos={post.videos} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-12 border-t border-white/10">
          <a
            href="/"
            className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Performances
          </a>

          <a
            href="/#latest"
            className="px-6 py-3 glass-strong rounded-full font-medium hover:bg-white/15 transition-all"
          >
            View More Shows
          </a>
        </div>
      </article>
    </div>
  );
}
