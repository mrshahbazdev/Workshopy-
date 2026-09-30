import { useState } from 'react';
import { uid, fmt, mechanicTotals, jobLines } from '../lib/model.js';

export default function MechanicsPanel({ store, update }) {
  const [f, setF] = useState({ name: '', role: '', phone: '' });
  const cur = store.settings.currency;
  const totals = mechanicTotals(store);
  const jobs = store.jobCards || [];

  return (
    <div className="panel">
      <h2 className="ptitle" style={{ marginTop: 0 }}>Mechanics &amp; work</h2>
      <div className="frow" style={{ marginBottom: 14 }}>
        <input className="in" placeholder="Name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className="in" placeholder="Role (mechanic / electrician / denter)" value={f.role} onChange={e => setF({ ...f, role: e.target.value })} />
        <input className="in" placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        <button className="btn small" onClick={() => {
          if (!f.name.trim()) return alert('Name required');
          update(s => s.mechanics.push({ id: uid('mc'), ...f, status: 'active' }), 'mechanic added');
          setF({ name: '', role: '', phone: '' });
        }}>+ Mechanic</button>
      </div>

      <table className="grid">
        <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th style={{ textAlign: 'right' }}>Jobs</th><th style={{ textAlign: 'right' }}>Labor billed</th><th></th></tr></thead>
        <tbody>
          {(store.mechanics || []).map(m => {
            const t = totals.find(x => x.name === m.name);
            return (
              <tr key={m.id}>
                <td><b>{m.name}</b></td><td>{m.role}</td><td>{m.phone}</td>
                <td><button className={'chip' + (m.status === 'active' ? ' on' : '')} onClick={() => update(s => { const x = s.mechanics.find(z => z.id === m.id); x.status = x.status === 'active' ? 'left' : 'active'; }, 'mechanic status')}>{m.status}</button></td>
                <td style={{ textAlign: 'right' }}>{t?.jobs || 0}</td>
                <td style={{ textAlign: 'right' }}>{fmt(t?.labor || 0, cur)}</td>
                <td><button className="icon" onClick={() => { if (confirm('Delete mechanic?')) update(s => s.mechanics = s.mechanics.filter(x => x.id !== m.id), 'mechanic deleted'); }}>✕</button></td>
              </tr>
            );
          })}
          {!(store.mechanics || []).length && <tr><td colSpan="7" className="muted">No mechanics yet.</td></tr>}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ marginTop: 18 }}>Work per mechanic (all time)</h3>
      <table className="grid">
        <thead><tr><th>Mechanic</th><th style={{ textAlign: 'right' }}>Jobs done</th><th style={{ textAlign: 'right' }}>Labor billed</th></tr></thead>
        <tbody>
          {totals.map((t, i) => <tr key={i}><td>{t.name}</td><td style={{ textAlign: 'right' }}>{t.jobs}</td><td style={{ textAlign: 'right' }}>{fmt(t.labor, cur)}</td></tr>)}
          {!totals.length && <tr><td colSpan="3" className="muted">No work recorded yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
