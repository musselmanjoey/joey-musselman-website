'use client';

import { useEffect, useState } from 'react';

export default function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated background elements */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-circus-red rounded-full blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Heading */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold mb-6 leading-none">
            <span className="gradient-text">Joey</span>
            <br />
            <span className="text-white">Musselman</span>
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl text-white/60 font-light mb-8">
            FSU Flying High Circus Performer
          </p>
        </div>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
          {[
            { number: '4', label: 'Years' },
            { number: '4', label: 'Acts' },
            { number: '100+', label: 'Shows' },
            { number: '∞', label: 'Passion' },
          ].map((stat, index) => (
            <div
              key={index}
              className="glass-strong rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer glow-hover group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform">
                {stat.number}
              </div>
              <div className="text-sm text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#latest"
            className="group relative px-8 py-4 bg-gradient-to-r from-circus-red to-orange-500 rounded-full font-bold text-lg overflow-hidden glow-hover"
          >
            <span className="relative z-10">Watch Performances</span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-circus-red opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </a>
          <a
            href="#about"
            className="px-8 py-4 glass-strong rounded-full font-bold text-lg hover:bg-white/15 transition-all"
          >
            Learn More
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
