import { useState } from 'react';
import { fmt, num, today, dayTotals, mechanicTotals, grossProfit, unpaidJobs, jobInfo, jobOutstanding, jobLines, jobTotal, part } from '../lib/model.js';
import { dayRegisterHtml } from '../lib/prints.js';
import { jobsCsv } from '../lib/csv.js';

export default function ReportsPanel({ store }) {
  const [from, setFrom] = useState(today().slice(0, 8) + '01');
  const [to, setTo] = useState(today());
  const cur = store.settings.currency;
  const gp = grossProfit(store, from, to);
  const mech = mechanicTotals(store, from, to);
  const unpaid = unpaidJobs(store);
  const partsUsed = {};
  for (const j of store.jobCards || []) {
    if (j.status === 'cancelled') continue;
    const d = (j.in_on || '').slice(0, 10);
    if (from && d < from) continue;
    if (to && d > to) continue;
    for (const l of jobLines(store, j.id)) {
      if (l.kind !== 'part') continue;
      const p = l.part_id ? part(store, l.part_id) : null;
      const key = l.description;
      partsUsed[key] = partsUsed[key] || { qty: 0, amount: 0, cost: 0 };
      partsUsed[key].qty += num(l.qty);
      partsUsed[key].amount += num(l.qty) * num(l.rate);
      if (p) partsUsed[key].cost += num(l.qty) * num(p.cost);
    }
  }
  const partsRows = Object.entries(partsUsed).sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div className="panel">
      <h2 className="ptitle" style={{ marginTop: 0 }}>Reports</h2>
      <div className="frow">
        <label>From<input className="in" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>To<input className="in" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <button className="btn ghost small" onClick={() => window.api.export.text({ text: jobsCsv(store, jobInfo, jobTotal), suggestedName: 'workshopy-jobs.csv' })}>Jobs CSV</button>
        <button className="btn ghost small" onClick={() => window.api.export.print({ html: dayRegisterHtml(store, today(), dayTotals(store, today())), suggestedName: `workshopy-day-${today()}.pdf` })}>Print today</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="pcard"><div className="muted" style={{ fontSize: 12 }}>Billed (parts + labor)</div><div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(gp.revenue, cur)}</div></div>
        <div className="pcard"><div className="muted" style={{ fontSize: 12 }}>Parts cost</div><div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(gp.cost, cur)}</div></div>
        <div className="pcard"><div className="muted" style={{ fontSize: 12 }}>Gross profit</div><div style={{ fontSize: 22, fontWeight: 800, color: gp.profit >= 0 ? '#059669' : '#dc2626' }}>{fmt(gp.profit, cur)}</div></div>
        <div className="pcard"><div className="muted" style={{ fontSize: 12 }}>Outstanding (all time)</div><div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{fmt(unpaid.reduce((t, j) => t + jobOutstanding(store, j.id), 0), cur)}</div><div className="muted" style={{ fontSize: 11 }}>{unpaid.length} job(s)</div></div>
      </div>

      <h3 className="ptitle">Mechanic-wise labor</h3>
      <table className="grid" style={{ marginBottom: 16 }}>
        <thead><tr><th>Mechanic</th><th style={{ textAlign: 'right' }}>Jobs</th><th style={{ textAlign: 'right' }}>Labor billed</th></tr></thead>
        <tbody>
          {mech.map((t, i) => <tr key={i}><td>{t.name}</td><td style={{ textAlign: 'right' }}>{t.jobs}</td><td style={{ textAlign: 'right' }}>{fmt(t.labor, cur)}</td></tr>)}
          {!mech.length && <tr><td colSpan="3" className="muted">No labor in range.</td></tr>}
        </tbody>
      </table>

      <h3 className="ptitle">Parts consumed</h3>
      <table className="grid" style={{ marginBottom: 16 }}>
        <thead><tr><th>Part</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Billed</th><th style={{ textAlign: 'right' }}>Margin</th></tr></thead>
        <tbody>
          {partsRows.map(([name, v]) => <tr key={name}><td>{name}</td><td style={{ textAlign: 'right' }}>{v.qty}</td><td style={{ textAlign: 'right' }}>{fmt(v.cost, cur)}</td><td style={{ textAlign: 'right' }}>{fmt(v.amount, cur)}</td><td style={{ textAlign: 'right' }}>{fmt(v.amount - v.cost, cur)}</td></tr>)}
          {!partsRows.length && <tr><td colSpan="5" className="muted">No parts consumed in range.</td></tr>}
        </tbody>
      </table>

      <h3 className="ptitle">Unpaid balances</h3>
      <table className="grid">
        <thead><tr><th>Job #</th><th>Vehicle</th><th>Customer</th><th>Phone</th><th>In</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
        <tbody>
          {unpaid.map(j => {
            const i = jobInfo(store, j);
            return <tr key={j.id}><td>#{j.no}</td><td>{i.vehicle?.plate}</td><td>{i.customer?.name}</td><td>{i.customer?.phone}</td><td>{j.in_on}</td><td style={{ textAlign: 'right' }}>{fmt(jobOutstanding(store, j.id), cur)}</td></tr>;
          })}
          {!unpaid.length && <tr><td colSpan="6" className="muted">Nothing outstanding.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
