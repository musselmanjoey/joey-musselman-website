'use client';

interface RoomCodeDisplayProps {
  code: string;
  size?: 'small' | 'large';
}

export function RoomCodeDisplay({ code, size = 'large' }: RoomCodeDisplayProps) {
  const textSize = size === 'large' ? 'text-6xl md:text-8xl' : 'text-3xl md:text-4xl';
  const padding = size === 'large' ? 'px-8 py-4' : 'px-4 py-2';

  return (
    <div className="text-center">
      <p className="text-[var(--muted)] text-sm uppercase tracking-wider mb-2">Room Code</p>
      <div className={`${padding} bg-white rounded-2xl inline-block border-2 border-[var(--border)]`}>
        <span className={`${textSize} font-bold tracking-[0.2em] text-[var(--foreground)] font-mono`}>
          {code}
        </span>
      </div>
      <p className="text-[var(--muted)] text-sm mt-3">
        Join at <span className="text-accent font-medium">joeymusselman.com/party/play</span>
      </p>
    </div>
  );
}
