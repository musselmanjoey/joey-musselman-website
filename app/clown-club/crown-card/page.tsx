'use client';

import { QRCodeSVG } from 'qrcode.react';

export default function CrownCardPage() {
  const vipUrl = 'https://joeymusselman.com/clown-club?vip=CLOWNKING';

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8 print:p-4">
      <div className="w-[4in] h-[6in] border-4 border-yellow-500 rounded-2xl p-6 flex flex-col items-center justify-between bg-gradient-to-b from-yellow-50 to-white print:border-2">
        {/* Crown Header */}
        <div className="text-center">
          <div className="text-8xl mb-2">👑</div>
          <h1 className="text-3xl font-bold text-yellow-600 mb-1">
            CONGRATULATIONS!
          </h1>
          <p className="text-lg text-gray-700 font-medium">
            You&apos;ve Won the Crown!
          </p>
        </div>

        {/* Middle section */}
        <div className="text-center space-y-4">
          <p className="text-gray-600 text-sm px-4">
            Scan this code to join Clown Club with your exclusive crown.
            You&apos;ll be the only one wearing it!
          </p>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl shadow-lg inline-block">
            <QRCodeSVG
              value={vipUrl}
              size={160}
              level="H"
              includeMargin={false}
            />
          </div>

          <p className="text-xs text-gray-400">
            joeymusselman.com/clown-club
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-2xl mb-2">
            <span>🤡</span>
            <span className="text-yellow-500 font-bold">CLOWN CLUB</span>
            <span>🤡</span>
          </div>
          <p className="text-xs text-gray-400">
            Your crown awaits, Your Majesty!
          </p>
        </div>
      </div>

      {/* Print button - hidden when printing */}
      <button
        onClick={() => window.print()}
        className="fixed bottom-8 right-8 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg print:hidden"
      >
        Print Card
      </button>
    </main>
  );
}
