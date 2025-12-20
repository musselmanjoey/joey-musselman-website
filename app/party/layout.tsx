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
      <div className="min-h-screen bg-white text-[var(--foreground)]">
        {children}
      </div>
    </SocketProvider>
  );
}
