import { useEffect, useState } from 'react';
import CrudTable from '../../components/admin/CrudTable';
import { apiFetch } from '../../lib/supabase';

export default function ManagePopularRoutes() {
  const [existingRoutes, setExistingRoutes] = useState([]);

  useEffect(() => {
    apiFetch('/admin/routes-admin')
      .then((res) => setExistingRoutes(res.data || []))
      .catch(() => {});
  }, []);

  return (
    <CrudTable
      title="Popular Routes"
      description="Curated routes displayed on the homepage to encourage bookings. Select from existing routes or create custom ones."
      listPath="/admin/popular-routes"
      createPath="/admin/popular-routes"
      updatePath="/admin/popular-routes"
      deletePath="/admin/popular-routes"
      deleteConfirmMessage={(row) =>
        `Remove "${row.origin} → ${row.destination}" from popular routes? This hides it from the homepage.`
      }
      renderFormHeader={({ form, setForm }) => (
        <div className="rounded-xl border border-amber/20 bg-amber/5 p-3.5 space-y-1">
          <label className="label font-medium !text-amber">Quick select existing route (optional)</label>
          <select
            className="input !bg-midnight-3"
            value=""
            onChange={(e) => {
              const selected = existingRoutes.find((r) => r.id === e.target.value);
              if (selected) {
                setForm((prev) => ({
                  ...prev,
                  origin: selected.origin,
                  destination: selected.destination,
                  base_fare: selected.base_fare || prev.base_fare || '',
                  duration_text: selected.estimated_duration_minutes
                    ? `~${Math.floor(selected.estimated_duration_minutes / 60)} hrs${selected.estimated_duration_minutes % 60 ? ' ' + (selected.estimated_duration_minutes % 60) + 'm' : ''}`
                    : prev.duration_text || '',
                }));
              }
            }}
          >
            <option value="">-- Select from existing system routes --</option>
            {existingRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.origin} → {r.destination} {r.base_fare ? `(KES ${Number(r.base_fare).toLocaleString()})` : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate">Selecting a route pre-fills the fields below. You can still customize or leave blank to enter manually.</p>
        </div>
      )}
      columns={[
        { key: 'sort_order', label: '#' },
        { key: 'origin', label: 'Origin' },
        { key: 'destination', label: 'Destination' },
        { key: 'base_fare', label: 'From (KES)', render: (r) => r.base_fare ? `KES ${Number(r.base_fare).toLocaleString()}` : '—' },
        { key: 'duration_text', label: 'Duration' },
        { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
      ]}
      fields={[
        { key: 'origin', label: 'Origin city', required: true },
        { key: 'destination', label: 'Destination city', required: true },
        { key: 'description', label: 'Short description', type: 'textarea' },
        { key: 'base_fare', label: 'Starting fare (KES)', type: 'number' },
        { key: 'duration_text', label: 'Duration text (e.g. ~8 hrs)' },
        { key: 'image_url', label: 'Image URL (optional)' },
        { key: 'sort_order', label: 'Sort order (0 = first)', type: 'number' },
        { key: 'is_active', label: 'Show on homepage', type: 'checkbox' },
      ]}
    />
  );
}

