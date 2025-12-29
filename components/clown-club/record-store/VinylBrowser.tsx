'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface VinylRecord {
  id: number;
  title: string;
  artist_name: string;
  release_year?: number;
  cover_url?: string;
  spine_color?: string;
  format?: string;
  rating?: number;
  spotify_id?: string;
}

interface VinylBrowserProps {
  socket: Socket;
  onClose: () => void;
  onPlayAlbum?: (spotifyId: string) => void;
  onViewReview?: (albumId: number) => void;
}

export function VinylBrowser({ socket, onClose, onPlayAlbum, onViewReview }: VinylBrowserProps) {
  const [vinyl, setVinyl] = useState<VinylRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');

  useEffect(() => {
    // Request vinyl collection
    socket.emit('rs:browse-vinyl', { genre: selectedGenre || undefined });

    const handleVinylData = (data: { vinyl: VinylRecord[]; total: number }) => {
      setVinyl(data.vinyl);
      setLoading(false);
    };

    const handleError = (data: { error: string }) => {
      setError(data.error);
      setLoading(false);
    };

    socket.on('rs:vinyl-data', handleVinylData);
    socket.on('rs:error', handleError);

    return () => {
      socket.off('rs:vinyl-data', handleVinylData);
      socket.off('rs:error', handleError);
    };
  }, [socket, selectedGenre]);

  const handlePlay = (record: VinylRecord) => {
    if (record.spotify_id && onPlayAlbum) {
      onPlayAlbum(record.spotify_id);
    } else if (record.spotify_id) {
      // Play directly via socket
      socket.emit('rs:play', { context_uri: `spotify:album:${record.spotify_id}` });
    }
  };

  const handleViewReview = (record: VinylRecord) => {
    if (onViewReview) {
      onViewReview(record.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-[#3d3d5c]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3d3d5c]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💿</span>
            <h2 className="text-xl font-bold text-white">Vinyl Collection</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-2"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-4xl mb-2 animate-spin">💿</div>
                <p className="text-gray-400">Loading collection...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">😢</div>
              <p className="text-red-400">{error}</p>
            </div>
          ) : vinyl.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-gray-400">No vinyl records in collection yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {vinyl.map((record) => (
                <VinylCard
                  key={record.id}
                  record={record}
                  onPlay={() => handlePlay(record)}
                  onViewReview={() => handleViewReview(record)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VinylCardProps {
  record: VinylRecord;
  onPlay: () => void;
  onViewReview: () => void;
}

function VinylCard({ record, onPlay, onViewReview }: VinylCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-[#2d2d44] rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Album Cover */}
      <div className="aspect-square bg-[#3d3d5c] relative">
        {record.cover_url ? (
          <img
            src={record.cover_url}
            alt={`${record.title} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: record.spine_color || '#3d3d5c' }}
          >
            <span className="text-4xl">💿</span>
          </div>
        )}

        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
            {record.spotify_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
                className="p-2 bg-green-500 rounded-full hover:bg-green-600 transition"
                title="Play on Spotify"
              >
                <span className="text-lg">▶️</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewReview();
              }}
              className="p-2 bg-[#dc2626] rounded-full hover:bg-red-700 transition"
              title="View Review"
            >
              <span className="text-lg">📝</span>
            </button>
          </div>
        )}

        {/* Rating Badge */}
        {record.rating && (
          <div className="absolute top-2 right-2 bg-black/70 text-yellow-400 px-2 py-0.5 rounded text-sm">
            {'★'.repeat(record.rating)}
          </div>
        )}

        {/* Format Badge */}
        {record.format && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs">
            {record.format}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white font-medium text-sm truncate" title={record.title}>
          {record.title}
        </h3>
        <p className="text-gray-400 text-xs truncate" title={record.artist_name}>
          {record.artist_name}
        </p>
        {record.release_year && (
          <p className="text-gray-500 text-xs">{record.release_year}</p>
        )}
      </div>
    </div>
  );
}
