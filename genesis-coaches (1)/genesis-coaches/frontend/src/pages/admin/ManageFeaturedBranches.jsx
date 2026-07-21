import { useEffect, useState } from 'react';
import CrudTable from '../../components/admin/CrudTable';
import { apiFetch } from '../../lib/supabase';

export default function ManageFeaturedBranches() {
  const [existingBranches, setExistingBranches] = useState([]);

  useEffect(() => {
    apiFetch('/admin/branches')
      .then((res) => setExistingBranches(res.data || []))
      .catch(() => {});
  }, []);

  return (
    <CrudTable
      title="Featured Branches"
      description="Highlight key branch offices on the homepage. Select from existing operational branches or enter custom details."
      listPath="/admin/featured-branches"
      createPath="/admin/featured-branches"
      updatePath="/admin/featured-branches"
      deletePath="/admin/featured-branches"
      deleteConfirmMessage={(row) =>
        `Remove "${row.name}" from featured branches? This hides it from the homepage.`
      }
      renderFormHeader={({ form, setForm }) => (
        <div className="rounded-xl border border-amber/20 bg-amber/5 p-3.5 space-y-1">
          <label className="label font-medium !text-amber">Quick select existing branch (optional)</label>
          <select
            className="input !bg-midnight-3"
            value=""
            onChange={(e) => {
              const selected = existingBranches.find((b) => b.id === e.target.value);
              if (selected) {
                setForm((prev) => ({
                  ...prev,
                  name: selected.name,
                  city: selected.city,
                  address: selected.address || prev.address || '',
                  phone: selected.phone || prev.phone || '',
                }));
              }
            }}
          >
            <option value="">-- Select from existing branches --</option>
            {existingBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate">Selecting a branch pre-fills the fields below. You can still customize or leave blank to enter manually.</p>
        </div>
      )}
      columns={[
        { key: 'sort_order', label: '#' },
        { key: 'name', label: 'Name' },
        { key: 'city', label: 'City' },
        { key: 'phone', label: 'Phone' },
        { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
      ]}
      fields={[
        { key: 'name', label: 'Branch name', required: true },
        { key: 'city', label: 'City', required: true },
        { key: 'address', label: 'Address' },
        { key: 'phone', label: 'Phone' },
        { key: 'description', label: 'Short description', type: 'textarea' },
        { key: 'image_url', label: 'Image URL (optional)' },
        { key: 'sort_order', label: 'Sort order (0 = first)', type: 'number' },
        { key: 'is_active', label: 'Show on homepage', type: 'checkbox' },
      ]}
    />
  );
}

