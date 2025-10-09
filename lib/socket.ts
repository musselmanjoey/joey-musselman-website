// WebSocket server configuration
export const getSocketUrl = () => {
  // In production, use Railway WebSocket server
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'https://your-railway-url.up.railway.app';
  }

  // In development, use localhost
  return 'http://localhost:3001';
};
