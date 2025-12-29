'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Review {
  id: number;
  album_id: number;
  album_title: string;
  artist_name: string;
  cover_url?: string;
  rating?: number;
  review_text?: string;
  standout_tracks?: string[];
  listen_count?: number;
  source?: string;
  date_reviewed?: string;
  scanned_images?: string[];
}

interface ReviewPanelProps {
  socket: Socket;
  albumId?: number;
  onClose: () => void;
  onPlayAlbum?: (spotifyId: string) => void;
}

export function ReviewPanel({ socket, albumId, onClose, onPlayAlbum }: ReviewPanelProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (albumId) {
      socket.emit('rs:view-review', { albumId });
    }

    const handleReviewData = (data: { review: Review | null; message?: string }) => {
      setReview(data.review);
      setLoading(false);
    };

    const handleError = (data: { error: string }) => {
      setError(data.error);
      setLoading(false);
    };

    socket.on('rs:review-data', handleReviewData);
    socket.on('rs:error', handleError);

    return () => {
      socket.off('rs:review-data', handleReviewData);
      socket.off('rs:error', handleError);
    };
  }, [socket, albumId]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-gray-600'}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a1a2e] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-[#3d3d5c]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#3d3d5c]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <h2 className="text-xl font-bold text-white">Album Review</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition p-2"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-4xl mb-2 animate-pulse">📖</div>
                  <p className="text-gray-400">Loading review...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">😢</div>
                <p className="text-red-400">{error}</p>
              </div>
            ) : !review ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-gray-400">No review found for this album</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Album Header */}
                <div className="flex gap-4">
                  {/* Cover Art */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-[#3d3d5c]">
                    {review.cover_url ? (
                      <img
                        src={review.cover_url}
                        alt={review.album_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">💿</span>
                      </div>
                    )}
                  </div>

                  {/* Album Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-xl truncate">
                      {review.album_title}
                    </h3>
                    <p className="text-gray-400 text-lg truncate">{review.artist_name}</p>

                    {review.rating && (
                      <div className="mt-2 text-2xl">{renderStars(review.rating)}</div>
                    )}

                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      {review.listen_count && (
                        <span>🎧 {review.listen_count} listens</span>
                      )}
                      {review.source && (
                        <span className="capitalize">📖 {review.source}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                {review.review_text && (
                  <div>
                    <h4 className="text-gray-400 text-sm font-semibold uppercase mb-2">
                      Review
                    </h4>
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {review.review_text}
                    </div>
                  </div>
                )}

                {/* Standout Tracks */}
                {review.standout_tracks && review.standout_tracks.length > 0 && (
                  <div>
                    <h4 className="text-gray-400 text-sm font-semibold uppercase mb-2">
                      Standout Tracks
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {review.standout_tracks.map((track, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-[#3d3d5c] text-gray-300 rounded-full text-sm"
                        >
                          🎵 {track}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scanned Images */}
                {review.scanned_images && review.scanned_images.length > 0 && (
                  <div>
                    <h4 className="text-gray-400 text-sm font-semibold uppercase mb-2">
                      Scanned Notes
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {review.scanned_images.map((imageUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(imageUrl)}
                          className="aspect-[3/4] rounded-lg overflow-hidden bg-[#3d3d5c] hover:ring-2 hover:ring-[#dc2626] transition"
                        >
                          <img
                            src={imageUrl}
                            alt={`Scanned note ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date */}
                {review.date_reviewed && (
                  <p className="text-gray-500 text-sm text-right">
                    Reviewed: {new Date(review.date_reviewed).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Scanned note"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
