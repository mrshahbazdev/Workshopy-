const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function csvText(rows) {
  return rows.map(r => r.map(q).join(',')).join('\n');
}

export function customersCsv(store) {
  const rows = [['name', 'phone', 'address', 'vehicles']];
  for (const c of store.customers || []) {
    const vs = (store.vehicles || []).filter(v => v.customer_id === c.id).map(v => v.plate).join(' | ');
    rows.push([c.name, c.phone, c.address || '', vs]);
  }
  return csvText(rows);
}

export function partsCsv(store, partStock) {
  const rows = [['code', 'name', 'category', 'unit', 'cost', 'price', 'low_stock', 'stock']];
  for (const p of store.parts || []) {
    rows.push([p.code, p.name, p.category || '', p.unit || 'pc', p.cost, p.price, p.low_stock, partStock(store, p.id)]);
  }
  return csvText(rows);
}

export function jobsCsv(store, jobInfo, jobTotal) {
  const rows = [['job_no', 'in_on', 'status', 'plate', 'vehicle', 'customer', 'phone', 'mechanic', 'complaint', 'total']];
  for (const j of store.jobCards || []) {
    const i = jobInfo(store, j);
    rows.push([j.no, j.in_on, j.status, i.vehicle?.plate || '', [i.vehicle?.make, i.vehicle?.model].filter(Boolean).join(' '), i.customer?.name || '', i.customer?.phone || '', i.mechanic?.name || '', j.complaint || '', jobTotal(store, j.id)]);
  }
  return csvText(rows);
}
