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
    <section className="relative flex min-h-[92vh] flex-col justify-between overflow-hidden pb-8 pt-3 sm:min-h-[88vh] sm:justify-center sm:py-16 md:py-24">
      {/* Rotating background layer */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-[length:100%_auto] bg-top bg-no-repeat sm:bg-cover sm:bg-center transition-opacity duration-[1500ms] ease-in-out"
            style={{ backgroundImage: `url(${src})`, opacity: active === i ? 1 : 0 }}
            aria-hidden={active !== i}
          />
        ))}
        {/* Crisp overlay that showcases background image behind Genesis Coaches title and center viewport */}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/60 via-transparent to-midnight/95 sm:from-midnight/50 sm:via-midnight/25 sm:to-midnight/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/30 via-transparent to-midnight/30" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-between px-4 sm:px-6">
        <div className="pt-1 sm:pt-0">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.35em] text-amber drop-shadow-md sm:mb-2 sm:text-xs animate-riseIn">
            Intercity travel, reimagined
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-cream drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] sm:text-6xl md:text-7xl animate-riseIn">
            GENESIS COACHES
          </h1>
          <p
            className="mt-1.5 font-display text-lg font-medium text-amber drop-shadow-md sm:mt-2 sm:text-3xl md:text-4xl animate-riseIn"
            style={{ animationDelay: '0.1s' }}
          >
            Beyond your Imagination
          </p>

          {/* Signature route-line divider */}
          <div className="route-line my-3 max-w-md sm:my-8">
            <span className="route-line-marker animate-drive" />
          </div>
        </div>

        {/* Keep the search form close to the hero image on mobile. */}
        <form
          onSubmit={handleSearch}
          className="mt-[24vh] grid max-w-4xl grid-cols-1 gap-3 rounded-2xl border border-white/20 bg-midnight-2/80 p-4 backdrop-blur-md sm:mt-0 sm:grid-cols-4 animate-riseIn"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="sm:col-span-1">
            <label className="label">From</label>
            <input className="input bg-midnight-3/70 focus:bg-midnight-3" placeholder="e.g. Nairobi" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <label className="label">To</label>
            <input className="input bg-midnight-3/70 focus:bg-midnight-3" placeholder="e.g. Mombasa" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <label className="label">Travel date</label>
            <input type="date" className="input bg-midnight-3/70 focus:bg-midnight-3" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex items-end sm:col-span-1">
            <button type="submit" className="btn-primary w-full shadow-lg shadow-amber/20">Search buses</button>
          </div>
        </form>
      </div>
    </section>
  );
}
