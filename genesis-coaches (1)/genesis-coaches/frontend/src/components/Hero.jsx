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
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {/* Rotating background layer */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
            style={{ backgroundImage: `url(${src})`, opacity: active === i ? 1 : 0 }}
            aria-hidden={active !== i}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/40 via-midnight/25 to-midnight/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/30 via-transparent to-midnight/30" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-amber animate-riseIn">
          Intercity travel, reimagined
        </p>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-cream sm:text-6xl md:text-7xl animate-riseIn">
          GENESIS COACHES
        </h1>
        <p
          className="mt-3 font-display text-2xl font-medium text-amber sm:text-3xl md:text-4xl animate-riseIn"
          style={{ animationDelay: '0.1s' }}
        >
          Beyond your Imagination
        </p>

        {/* Signature route-line divider */}
        <div className="route-line my-8 max-w-md">
          <span className="route-line-marker animate-drive" />
        </div>

        <form
          onSubmit={handleSearch}
          className="grid max-w-4xl grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-midnight-2/80 p-4 backdrop-blur-md sm:grid-cols-4 animate-riseIn"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="sm:col-span-1">
            <label className="label">From</label>
            <input className="input" placeholder="e.g. Nairobi" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <label className="label">To</label>
            <input className="input" placeholder="e.g. Mombasa" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <label className="label">Travel date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex items-end sm:col-span-1">
            <button type="submit" className="btn-primary w-full">Search buses</button>
          </div>
        </form>
      </div>
    </section>
  );
}
