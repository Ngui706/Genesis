import CrudTable from '../../components/admin/CrudTable';

export default function ManageBranches() {
  return (
    <CrudTable
      title="Branches"
      description="Physical depots / offices staff are assigned to."
      listPath="/admin/branches"
      createPath="/admin/branches"
      updatePath="/admin/branches"
      deletePath="/admin/branches"
      deleteConfirmMessage={(row) => `Delete branch "${row.name}"? This cannot be undone. Any staff assigned to this branch will need to be reassigned.`}
      columns={[
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
        { key: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
