import { fmt, today, openJobs, unpaidJobs, lowStockParts, dayTotals, jobInfo, jobOutstanding } from '../lib/model.js';

const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', ready: 'Ready', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function Dashboard({ store, go }) {
  const cur = store.settings.currency;
  const open = openJobs(store);
  const unpaid = unpaidJobs(store);
  const dueTotal = unpaid.reduce((t, j) => t + jobOutstanding(store, j.id), 0);
  const low = lowStockParts(store);
  const dt = dayTotals(store, today());

  const cards = [
    { label: 'Vehicles in workshop', value: open.length, sub: open.filter(j => j.status === 'in_progress').length + ' in progress', onClick: () => go('jobs') },
    { label: "Today's collection", value: fmt(dt.sales, cur), sub: `${dt.receipts.length} receipt(s)`, onClick: () => go('collection') },
    { label: 'Unpaid balances', value: unpaid.length, sub: fmt(dueTotal, cur) + ' due', onClick: () => go('collection') },
    { label: 'Low-stock parts', value: low.length, sub: low.map(p => p.name).slice(0, 2).join(', '), onClick: () => go('parts') },
  ];

  return (
    <div className="panel">
      <h1 className="ptitle" style={{ marginTop: 0 }}>{store.settings.shopName || 'Workshopy'}</h1>
      <p className="muted" style={{ marginTop: -6 }}>
        {store.settings.shopAddress || 'Set your workshop name & address in Settings.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
        {cards.map(c => (
          <div key={c.label} className="pcard" onClick={c.onClick} style={{ cursor: 'pointer' }}>
            <div className="muted" style={{ fontSize: 12 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <h2 className="ptitle" style={{ marginTop: 22 }}>Vehicles in the workshop</h2>
      <table className="grid">
        <thead><tr><th>Job #</th><th>Vehicle</th><th>Customer</th><th>Complaint</th><th>Mechanic</th><th>In since</th><th>Status</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
        <tbody>
          {open.map(j => {
            const i = jobInfo(store, j);
            const due = jobOutstanding(store, j.id);
            return (
              <tr key={j.id} onClick={() => go('jobs')} style={{ cursor: 'pointer' }}>
                <td>#{j.no}</td>
                <td><b>{i.vehicle?.plate}</b> <span className="muted">{[i.vehicle?.make, i.vehicle?.model].filter(Boolean).join(' ')}</span></td>
                <td>{i.customer?.name}</td>
                <td className="muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.complaint}</td>
                <td>{i.mechanic?.name || '—'}</td>
                <td>{j.in_on}</td>
                <td><span className={'st-' + (j.status === 'ready' ? 'paid' : j.status === 'in_progress' ? 'partial' : 'sent')}>{STATUS_LABEL[j.status]}</span></td>
                <td style={{ textAlign: 'right' }}>{due ? fmt(due, cur) : '—'}</td>
              </tr>
            );
          })}
          {!open.length && <tr><td colSpan="8" className="muted">No vehicles inside — open a job card to start.</td></tr>}
        </tbody>
      </table>

      <h2 className="ptitle" style={{ marginTop: 22 }}>Quick actions</h2>
      <div className="row">
        <button className="btn" onClick={() => go('jobs')}>+ New job card</button>
        <button className="btn ghost" onClick={() => go('collection')}>Receive payment</button>
        <button className="btn ghost" onClick={() => go('parts')}>Stock in</button>
        <button className="btn ghost" onClick={() => go('reports')}>Day report</button>
      </div>
    </div>
  );
}
