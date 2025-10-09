'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function TestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const socketInstance = io('http://localhost:3001');

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('test-response', (data) => {
      console.log('Received test response:', data);
      setMessage(data.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendTestMessage = () => {
    if (socket) {
      socket.emit('test', { hello: 'world' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="glass-strong rounded-3xl p-12 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-8">
          <span className="gradient-text">WebSocket Test</span>
        </h1>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-white/80">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Test Button */}
          <button
            onClick={sendTestMessage}
            disabled={!isConnected}
            className="w-full px-6 py-4 bg-gradient-to-r from-circus-red to-orange-500 rounded-full font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Test Message
          </button>

          {/* Response Display */}
          {message && (
            <div className="glass p-4 rounded-xl">
              <p className="text-green-400 font-medium">✓ Response received:</p>
              <p className="text-white/80 mt-2">{message}</p>
            </div>
          )}

          {/* Socket ID */}
          {socket && (
            <div className="text-white/60 text-sm">
              Socket ID: {socket.id}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
