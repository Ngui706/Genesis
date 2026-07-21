import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import { API_URL } from '../lib/supabase';

const FEATURES = [
  { title: 'Live seat selection', desc: 'Pick your exact seat and watch availability update in real time — no double-booked seats, ever.' },
  { title: 'Instant e-tickets', desc: 'Confirmation and a QR-coded ticket land in your inbox and dashboard the second you pay.' },
  { title: 'Loyalty rewards', desc: 'Every trip earns points toward free travel and upgrades across the Genesis network.' },
  { title: 'Flexible cancellation', desc: 'Plans change. Cancel within policy and get your refund processed automatically.' },
];

function usePublicFetch(path) {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}${path}`)
      .then((r) => r.json())
      .then((body) => setData(body.data || []))
      .catch(() => {});
  }, [path]);
  return data;
}

export default function Home() {
  const navigate = useNavigate();
  const popularRoutes = usePublicFetch('/popular-routes');
  const featuredBranches = usePublicFetch('/featured-branches');
  const branchNews = usePublicFetch('/branch-updates/approved');

  return (
    <div>
      <Hero />

      {/* ── Why travel with us ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Why travel with us</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-cream sm:text-4xl">Built for the whole journey</h2>
          </div>
        </div>
        <div className="route-line mb-10"><span className="route-line-marker" style={{ left: '40%' }} /></div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 className="font-display text-lg font-semibold text-cream">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular Routes ── */}
      {popularRoutes.length > 0 && (
        <section className="border-t border-white/10 bg-midnight-2">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Trending</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-cream sm:text-4xl">Popular routes</h2>
            <div className="route-line my-8 max-w-md"><span className="route-line-marker animate-drive" /></div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {popularRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => navigate(`/search?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}&date=${new Date().toISOString().slice(0, 10)}`)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-midnight-3 p-0 text-left shadow-xl shadow-black/20 transition hover:border-amber/30 hover:shadow-amber/5"
                >
                  {/* Optional background image */}
                  {route.image_url && (
                    <div
                      className="h-36 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${route.image_url})` }}
                    >
                      <div className="h-full w-full bg-gradient-to-b from-transparent to-midnight-3" />
                    </div>
                  )}
                  {!route.image_url && (
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-midnight-3 to-midnight">
                      <span className="text-4xl opacity-10">🚌</span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-cream">{route.origin}</span>
                      <span className="text-amber">→</span>
                      <span className="font-display text-base font-bold text-cream">{route.destination}</span>
                    </div>

                    {route.description && (
                      <p className="mt-1 text-xs text-slate line-clamp-2">{route.description}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate">
                        {route.base_fare && (
                          <span className="rounded-full bg-amber/10 px-2 py-0.5 font-medium text-amber">
                            From KES {Number(route.base_fare).toLocaleString()}
                          </span>
                        )}
                        {route.duration_text && <span>{route.duration_text}</span>}
                      </div>
                      <span className="text-xs font-medium text-amber opacity-0 transition group-hover:opacity-100">
                        Book →
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Branches ── */}
      {featuredBranches.length > 0 && (
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Our network</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-cream sm:text-4xl">Top branches</h2>
            <div className="route-line my-8 max-w-md"><span className="route-line-marker" /></div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-midnight-2 shadow-xl shadow-black/20 transition hover:border-white/20"
                >
                  {branch.image_url && (
                    <div
                      className="h-32 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${branch.image_url})` }}
                    />
                  )}
                  {!branch.image_url && (
                    <div className="flex h-32 items-center justify-center bg-gradient-to-br from-midnight-3 to-midnight">
                      <span className="font-display text-4xl font-bold text-white/5">{branch.city}</span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-base font-semibold text-cream">{branch.name}</h3>
                        <p className="mt-0.5 text-sm text-amber">{branch.city}</p>
                      </div>
                    </div>

                    {branch.description && (
                      <p className="mt-2 text-xs leading-relaxed text-slate line-clamp-2">{branch.description}</p>
                    )}

                    <div className="mt-3 space-y-1 text-xs text-slate">
                      {branch.address && (
                        <p className="flex items-center gap-1.5">
                          <span className="text-amber/60">📍</span> {branch.address}
                        </p>
                      )}
                      {branch.phone && (
                        <p className="flex items-center gap-1.5">
                          <span className="text-amber/60">📞</span> {branch.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Branch News & Announcements ── */}
      {branchNews.length > 0 && (
        <section className="border-t border-white/10 bg-midnight-3">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Latest Announcements</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-cream sm:text-4xl">Branch news &amp; updates</h2>
            <div className="route-line my-8 max-w-md"><span className="route-line-marker" /></div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {branchNews.map((news) => (
                <div
                  key={news.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-midnight-2 p-0 shadow-xl shadow-black/20"
                >
                  {news.image_url && (
                    <div
                      className="h-40 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${news.image_url})` }}
                    />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-amber/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber">
                        {news.branch?.name || 'Genesis Network'}
                      </span>
                      <span className="text-xs text-slate">
                        {new Date(news.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-lg font-bold text-cream">{news.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate line-clamp-4">{news.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="border-t border-white/10 bg-midnight-2">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-bold text-cream sm:text-3xl">Ready for your next trip?</h2>
          <p className="mt-2 text-slate">Search routes, lock in your seat, and travel beyond your imagination.</p>
          <a href="/search" className="btn-primary mt-6 inline-flex">Find a bus</a>
        </div>
      </section>
    </div>
  );
}
