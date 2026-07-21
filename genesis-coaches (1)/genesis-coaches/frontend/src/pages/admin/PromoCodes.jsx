import CrudTable from '../../components/admin/CrudTable';

export default function PromoCodes() {
  return (
    <CrudTable
      title="Promo codes"
      description="Discount campaigns customers can apply at checkout."
      listPath="/admin/promo-codes"
      createPath="/admin/promo-codes"
      updatePath="/admin/promo-codes"
      deletePath="/admin/promo-codes"
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'discount_type', label: 'Type' },
        { key: 'discount_value', label: 'Value' },
        { key: 'used_count', label: 'Used' },
        { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
      ]}
      fields={[
        { key: 'code', label: 'Code (e.g. WELCOME10)', required: true },
        { key: 'description', label: 'Description' },
        { key: 'discount_type', label: 'Type', type: 'select', required: true, options: [{ value: 'percent', label: 'Percent off' }, { value: 'flat', label: 'Flat amount off' }] },
        { key: 'discount_value', label: 'Discount value', type: 'number', required: true },
        { key: 'max_uses', label: 'Max uses (blank = unlimited)', type: 'number' },
        { key: 'valid_until', label: 'Valid until', type: 'datetime-local' },
        { key: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
