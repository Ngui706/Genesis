import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Real Genesis Coaches fleet photography, served from /public/hero.
const HERO_IMAGES = [
  '/hero/hero1.jpg',
  '/hero/hero2.jpg',
  '/hero/hero3.jpg',
  '/hero/hero4.jpg',
  '/hero/hero5.jpg',
  '/hero/hero6.jpg',
  '/hero/hero7.jpg',
];

const ROTATE_MS = 5000;

export default function Hero() {
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % HERO_IMAGES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ origin, destination, date });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="relative flex min-h-[95vh] flex-col justify-between overflow-hidden pb-6 pt-10 sm:min-h-[88vh] sm:justify-center sm:py-16 md:py-24">
      {/* Rotating background layer */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-[center_top] sm:bg-center transition-opacity duration-[1500ms] ease-in-out"
            style={{ backgroundImage: `url(${src})`, opacity: active === i ? 1 : 0 }}
            aria-hidden={active !== i}
          />
        ))}
        {/* Subtle, clear gradient overlay ensuring text readability while leaving bus images crisp and vibrant */}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/70 via-midnight/20 to-midnight/90 sm:from-midnight/50 sm:via-midnight/25 sm:to-midnight/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/40 via-transparent to-midnight/40" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-between px-4 sm:px-6">
        <div className="pt-2 sm:pt-0">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.35em] text-amber animate-riseIn">
            Intercity travel, reimagined
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-cream sm:text-6xl md:text-7xl animate-riseIn">
            GENESIS COACHES
          </h1>
          <p
            className="mt-2 font-display text-xl font-medium text-amber sm:text-3xl md:text-4xl animate-riseIn"
            style={{ animationDelay: '0.1s' }}
          >
            Beyond your Imagination
          </p>

          {/* Signature route-line divider */}
          <div className="route-line my-4 max-w-md sm:my-8">
            <span className="route-line-marker animate-drive" />
          </div>
        </div>

        {/* Search form with frosted glass backdrop so background images remain visible on mobile */}
        <form
          onSubmit={handleSearch}
          className="mt-6 grid max-w-4xl grid-cols-1 gap-3 rounded-2xl border border-white/20 bg-midnight-2/50 p-4 backdrop-blur-lg sm:mt-0 sm:grid-cols-4 sm:bg-midnight-2/80 animate-riseIn"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="sm:col-span-1">
            <label className="label">From</label>
            <input className="input bg-midnight-3/60 focus:bg-midnight-3" placeholder="e.g. Nairobi" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <label className="label">To</label>
            <input className="input bg-midnight-3/60 focus:bg-midnight-3" placeholder="e.g. Mombasa" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <label className="label">Travel date</label>
            <input type="date" className="input bg-midnight-3/60 focus:bg-midnight-3" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex items-end sm:col-span-1">
            <button type="submit" className="btn-primary w-full shadow-lg shadow-amber/20">Search buses</button>
          </div>
        </form>
      </div>
    </section>
  );
}
