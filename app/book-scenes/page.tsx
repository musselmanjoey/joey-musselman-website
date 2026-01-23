import Link from 'next/link';
import { getAllScenes } from '@/lib/book-scenes/scenes';
import SceneCard from '@/components/book-scenes/SceneCard';

export const metadata = {
  title: 'Book Scenes',
  description: 'Ambient scenes inspired by your favorite books. Relax with cozy atmospheres and gentle effects.',
};

export default function BookScenesPage() {
  const scenes = getAllScenes();

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gray-100 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link href="/" className="text-accent hover:text-accent-hover text-sm mb-4 inline-block">
            &larr; Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-4">Book Scenes</h1>
          <p className="text-lg text-muted max-w-2xl">
            Immerse yourself in ambient scenes inspired by your favorite books.
            Perfect for reading, relaxing, or setting the mood for your next adventure.
          </p>
        </div>
      </div>

      {/* Scene Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {scenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <SceneCard key={scene.id} scene={scene} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted">No scenes available yet. Check back soon!</p>
          </div>
        )}

        {/* Coming Soon Section */}
        <div className="mt-16 p-8 bg-gray-50 rounded-lg border border-border">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Coming Soon</h2>
          <p className="text-muted mb-4">
            We&apos;re building a library of ambient book scenes. Future features include:
          </p>
          <ul className="list-disc list-inside text-muted space-y-2">
            <li>Scenes from popular fantasy books (Fourth Wing, ACOTAR, and more)</li>
            <li>Interactive book maps to explore different locations</li>
            <li>Weather effects: rain on windows, snowfall, thunderstorms</li>
            <li>Ambient sounds: crackling fire, gentle rain, forest atmosphere</li>
            <li>Customizable effect intensity</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
