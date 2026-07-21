import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../lib/supabase';

export default function SearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const origin = params.get('origin') || '';
  const destination = params.get('destination') || '';
  const date = params.get('date') || '';

  useEffect(() => {
    if (!origin || !destination || !date) return;
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/schedules/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${date}`)
      .then((r) => r.json())
      .then((data) => setSchedules(data.schedules || []))
      .catch(() => setError('Could not load schedules. Try again.'))
      .finally(() => setLoading(false));
  }, [origin, destination, date]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber">Available trips</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">
        {origin} <span className="text-slate">→</span> {destination}
      </h1>
      <p className="mt-1 text-sm text-slate">{date && new Date(date).toDateString()}</p>
      <div className="route-line my-6"><span className="route-line-marker" style={{ left: '15%' }} /></div>

      {loading && <p className="text-slate">Searching the network…</p>}
      {error && <p className="text-danger">{error}</p>}
      {!loading && !error && schedules.length === 0 && (
        <div className="card text-center">
          <p className="text-cream">No trips found for that route and date.</p>
          <Link to="/" className="mt-4 inline-block text-amber hover:underline">Try another search</Link>
        </div>
      )}

      <div className="space-y-4">
        {schedules.map((s) => (
          <div key={s.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-cream">
                {new Date(s.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-slate">{s.bus.name || s.bus.bus_class} · {s.bus.plate_number}</p>
              <p className="mt-1 text-xs text-slate">{s.seatsAvailable} seats available</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-mono text-xl font-semibold text-amber">KES {Number(s.fare).toLocaleString()}</p>
              <button
                onClick={() => navigate(`/select-seats/${s.id}`)}
                disabled={s.seatsAvailable <= 0}
                className="btn-primary disabled:opacity-40"
              >
                {s.seatsAvailable <= 0 ? 'Full' : 'Select seats'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
