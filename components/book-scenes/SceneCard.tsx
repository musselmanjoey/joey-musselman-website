import Link from 'next/link';
import { BookScene } from '@/lib/book-scenes/types';

interface SceneCardProps {
  scene: BookScene;
}

export default function SceneCard({ scene }: SceneCardProps) {
  return (
    <Link
      href={`/book-scenes/${scene.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-background hover:shadow-lg transition-all duration-300"
    >
      {/* Preview Image */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={scene.image}
          alt={scene.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 text-foreground px-4 py-2 rounded-full font-medium">
            View Scene
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-1">{scene.name}</h3>
        <p className="text-sm text-muted">{scene.description}</p>

        {/* Effect badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {scene.effects.map((effect, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize"
            >
              {effect.type}
            </span>
          ))}
        </div>

        {/* Book reference if present */}
        {scene.book && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted">
              From <span className="font-medium text-accent">{scene.book.title}</span>
              {scene.book.location && ` • ${scene.book.location}`}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
