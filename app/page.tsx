import Hero from '@/components/Hero';
import PerformanceGrid from '@/components/PerformanceGrid';

export default function Home() {
  return (
    <>
      <Hero />
      <PerformanceGrid />

      {/* About Section */}
      <section id="about" className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong rounded-3xl p-8 md:p-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              About Joey
            </h2>
            <div className="space-y-4 text-lg text-white/80 leading-relaxed">
              <p>
                Joey Musselman is a talented performer with the FSU Flying High Circus, one of the most prestigious
                collegiate circus programs in the United States. Since joining the circus, Joey has mastered multiple
                disciplines including juggling, trapeze, Russian bar, teeter board, and quartet acts.
              </p>
              <p>
                The Flying High Circus has been performing at Callaway Gardens since 1960, where select members
                conduct kids camps, teach circus skills to adults, and put on spectacular shows under the
                lakeside big top throughout the summer.
              </p>
              <p>
                Through countless hours of training and dedication, Joey has become a versatile performer capable
                of captivating audiences with both technical precision and artistic flair. Each performance
                represents years of hard work, teamwork, and a passion for the circus arts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Archive Section */}
      <section id="archive" className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center">
            <span className="gradient-text">Archive</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { year: '2018', count: '2 Shows', highlight: 'Callaway Gardens & Home Show' },
              { year: '2017', count: '2 Shows', highlight: 'Summer & Spring Performances' },
              { year: '2015', count: '2 Posts', highlight: 'Early Years & Debut' },
            ].map((item, index) => (
              <div
                key={index}
                className="glass-strong rounded-2xl p-8 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <div className="text-5xl font-bold gradient-text mb-4 group-hover:scale-110 transition-transform">
                  {item.year}
                </div>
                <div className="text-xl font-semibold text-white mb-2">{item.count}</div>
                <div className="text-white/60">{item.highlight}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/40">
            © {new Date().getFullYear()} Joey Musselman. All rights reserved.
          </p>
          <p className="text-white/30 text-sm mt-2">
            FSU Flying High Circus
          </p>
        </div>
      </footer>
    </>
  );
}
