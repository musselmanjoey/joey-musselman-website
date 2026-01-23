import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getScene, getAllScenes } from '@/lib/book-scenes/scenes';
import SceneViewer from '@/components/book-scenes/SceneViewer';

interface PageProps {
  params: Promise<{ sceneId: string }>;
}

export async function generateStaticParams() {
  const scenes = getAllScenes();
  return scenes.map((scene) => ({
    sceneId: scene.id,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { sceneId } = await params;
  const scene = getScene(sceneId);

  if (!scene) {
    return { title: 'Scene Not Found' };
  }

  return {
    title: `${scene.name} | Book Scenes`,
    description: scene.description,
  };
}

export default async function ScenePage({ params }: PageProps) {
  const { sceneId } = await params;
  const scene = getScene(sceneId);

  if (!scene) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* Minimal Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <Link
          href="/book-scenes"
          className="inline-flex items-center text-white/70 hover:text-white transition-colors bg-black/30 px-3 py-2 rounded-lg backdrop-blur-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Scenes
        </Link>
      </div>

      {/* Full Screen Viewer */}
      <div className="flex-1 flex items-center justify-center">
        <SceneViewer scene={scene} fullscreen />
      </div>
    </main>
  );
}
