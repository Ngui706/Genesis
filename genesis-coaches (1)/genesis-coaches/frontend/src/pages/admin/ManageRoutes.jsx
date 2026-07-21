import CrudTable from '../../components/admin/CrudTable';

export default function ManageRoutes() {
  return (
    <CrudTable
      title="Routes"
      description="Origin/destination pairs available for scheduling."
      listPath="/admin/routes-admin"
      createPath="/admin/routes-admin"
      updatePath="/admin/routes-admin"
      deletePath="/admin/routes-admin"
      columns={[
        { key: 'origin', label: 'Origin' },
        { key: 'destination', label: 'Destination' },
        { key: 'base_fare', label: 'Base fare', render: (r) => `KES ${Number(r.base_fare).toLocaleString()}` },
        { key: 'distance_km', label: 'Distance (km)' },
      ]}
      fields={[
        { key: 'origin', label: 'Origin', required: true },
        { key: 'destination', label: 'Destination', required: true },
        { key: 'distance_km', label: 'Distance (km)', type: 'number' },
        { key: 'estimated_duration_minutes', label: 'Duration (minutes)', type: 'number' },
        { key: 'base_fare', label: 'Base fare (KES)', type: 'number', required: true },
        { key: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
