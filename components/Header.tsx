export default function Header() {
  return (
    <header className="site-header relative h-64 md:h-auto md:fixed md:left-0 md:w-[300px] lg:w-[350px] md:top-0 md:bottom-0">
      <div className="h-full flex items-center md:items-start md:pt-16 px-8 md:px-10">
        <div className="site-branding">
          <h1 className="site-title text-3xl md:text-4xl lg:text-5xl font-bold mb-2 leading-tight">
            <a href="/" className="text-white hover:text-white/90 transition-opacity drop-shadow-lg">
              The Famous Joey Musselman
            </a>
          </h1>
          <p className="site-description text-white/80 text-sm md:text-base mt-4 drop-shadow">
            FSU Flying High Circus
          </p>
        </div>
      </div>
    </header>
  );
}
