import { SocketProvider } from './components/SocketProvider';

export const metadata = {
  title: 'Party Games',
  description: 'Multiplayer party games - Jackbox style!',
};

export default function PartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {children}
      </div>
    </SocketProvider>
  );
}
