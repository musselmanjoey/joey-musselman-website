'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/socket';
import Link from 'next/link';

interface GameImage {
  id: string;
  url: string;
  active: boolean;
  uploadedAt: number;
}

export default function AdminPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    const socketInstance = io(getSocketUrl());

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      socketInstance.emit('get-images');
    });

    socketInstance.on('images-list', (imagesList: GameImage[]) => {
      setImages(imagesList);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Check file type - be more permissive for iPhone images
    const isImage = file.type.startsWith('image/') ||
                    file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/);

    if (!isImage) {
      setUploadStatus(`File type not supported: ${file.type || 'unknown'}`);
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading...');

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      console.log('Image converted to base64, length:', base64.length);

      if (socket) {
        socket.emit('upload-image', {
          image: base64,
          filename: file.name
        });

        socket.once('image-uploaded', (response: { success: boolean; message: string; image?: GameImage }) => {
          console.log('Upload response:', response);
          if (response.success && response.image) {
            setImages(prev => [...prev, response.image!]);
            setUploadStatus('Image uploaded successfully!');
          } else {
            setUploadStatus(response.message || 'Upload failed');
          }
          setUploading(false);

          // Clear status after 3 seconds
          setTimeout(() => setUploadStatus(''), 3000);
        });
      } else {
        setUploadStatus('Not connected to server');
        setUploading(false);
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      setUploadStatus('Error reading file - try a different image format');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const toggleImageActive = (imageId: string) => {
    if (socket) {
      socket.emit('toggle-image-active', { imageId });
      setImages(prev =>
        prev.map(img =>
          img.id === imageId ? { ...img, active: !img.active } : img
        )
      );
    }
  };

  const deleteImage = (imageId: string) => {
    if (socket && confirm('Are you sure you want to delete this image?')) {
      socket.emit('delete-image', { imageId });
      setImages(prev => prev.filter(img => img.id !== imageId));
    }
  };

  const activeImages = images.filter(img => img.active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">
              Game Admin
            </h1>
            <p className="text-white/60">
              Upload and manage images for the caption contest
            </p>
          </div>
          <Link
            href="/game/host"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            ← Back to Host
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-strong rounded-2xl p-6">
            <p className="text-white/60 text-sm mb-1">Total Images</p>
            <p className="text-4xl font-bold gradient-text">{images.length}</p>
          </div>
          <div className="glass-strong rounded-2xl p-6">
            <p className="text-white/60 text-sm mb-1">Active Images</p>
            <p className="text-4xl font-bold gradient-text">{activeImages.length}</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="glass-strong rounded-3xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Upload New Image</h2>
          <p className="text-white/60 mb-6">
            Select an image from your device (max 5MB, JPG/PNG/HEIC)
          </p>

          <div className="flex flex-col gap-4">
            <label className="w-full">
              <input
                type="file"
                accept="image/*,.heic,.heif"
                capture="environment"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className={`
                px-8 py-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all
                ${uploading
                  ? 'border-white/20 bg-white/5 cursor-not-allowed'
                  : 'border-white/30 hover:border-circus-red hover:bg-white/5'
                }
              `}>
                <div className="text-4xl mb-2">📸</div>
                <p className="text-white/80 font-medium">
                  {uploading ? 'Uploading...' : 'Tap to select image'}
                </p>
                <p className="text-white/40 text-sm mt-1">
                  Works great from your phone!
                </p>
              </div>
            </label>

            {uploadStatus && (
              <div className={`glass rounded-xl p-4 text-center ${
                uploadStatus.includes('success') ? 'border-2 border-green-500' :
                uploadStatus.includes('Error') || uploadStatus.includes('failed') ? 'border-2 border-red-500' : ''
              }`}>
                <p className={
                  uploadStatus.includes('success') ? 'text-green-400' :
                  uploadStatus.includes('Error') || uploadStatus.includes('failed') ? 'text-red-400' :
                  'text-white/80'
                }>{uploadStatus}</p>
              </div>
            )}
          </div>
        </div>

        {/* Images Grid */}
        <div className="glass-strong rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Your Images</h2>

          {images.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🖼️</div>
              <p className="text-white/60 text-lg">No images uploaded yet</p>
              <p className="text-white/40">Upload your first image above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`glass rounded-2xl overflow-hidden ${
                    image.active ? 'ring-2 ring-circus-red' : ''
                  }`}
                >
                  {/* Image */}
                  <div className="relative aspect-video bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt="Game image"
                      className="w-full h-full object-cover"
                    />
                    {image.active && (
                      <div className="absolute top-2 right-2 bg-circus-red text-white px-3 py-1 rounded-full text-sm font-bold">
                        Active
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="p-4 space-y-2">
                    <button
                      onClick={() => toggleImageActive(image.id)}
                      className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
                        image.active
                          ? 'bg-circus-red/20 text-circus-red hover:bg-circus-red/30'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {image.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="w-full px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
