import { useState } from 'react';
import { uid, fmt, vehicleLabel, customer } from '../lib/model.js';
import { jobTotal } from '../lib/model.js';

function CustomerForm({ update, onDone }) {
  const [f, setF] = useState({ name: '', phone: '', address: '' });
  return (
    <div className="pcard" style={{ marginBottom: 12 }}>
      <div className="frow">
        <input className="in" placeholder="Customer name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className="in" placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        <input className="in" placeholder="Address" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
        <button className="btn small" onClick={() => {
          if (!f.name.trim()) return alert('Name required');
          update(s => s.customers.push({ id: uid('cu'), ...f, notes: '' }), 'customer added'); onDone();
        }}>Save</button>
        <button className="btn small ghost" onClick={onDone}>✕</button>
      </div>
    </div>
  );
}

function VehicleForm({ store, update, onDone }) {
  const [f, setF] = useState({ customer_id: '', plate: '', make: '', model: '', year: '', color: '', odometer: '' });
  return (
    <div className="pcard" style={{ marginBottom: 12 }}>
      <div className="frow">
        <select className="in" value={f.customer_id} onChange={e => setF({ ...f, customer_id: e.target.value })}>
          <option value="">— customer —</option>
          {(store.customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="in" placeholder="Plate * (e.g. ICT-1234)" value={f.plate} onChange={e => setF({ ...f, plate: e.target.value.toUpperCase() })} />
        <input className="in" placeholder="Make (Toyota)" value={f.make} onChange={e => setF({ ...f, make: e.target.value })} />
        <input className="in" placeholder="Model (Corolla)" value={f.model} onChange={e => setF({ ...f, model: e.target.value })} />
        <input className="in" style={{ width: 80 }} placeholder="Year" value={f.year} onChange={e => setF({ ...f, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        <input className="in" style={{ width: 90 }} placeholder="Color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} />
        <input className="in" style={{ width: 100 }} placeholder="Odometer" value={f.odometer} onChange={e => setF({ ...f, odometer: e.target.value.replace(/\D/g, '') })} />
        <button className="btn small" onClick={() => {
          if (!f.customer_id || !f.plate.trim()) return alert('Customer aur plate required');
          update(s => s.vehicles.push({ id: uid('vh'), ...f, notes: '' }), 'vehicle added'); onDone();
        }}>Save</button>
        <button className="btn small ghost" onClick={onDone}>✕</button>
      </div>
    </div>
  );
}

export default function VehiclesPanel({ store, update }) {
  const [showCust, setShowCust] = useState(false);
  const [showVeh, setShowVeh] = useState(false);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const ql = q.toLowerCase();
  const vehicles = (store.vehicles || []).filter(v =>
    !q || vehicleLabel(store, v).toLowerCase().includes(ql) ||
    (customer(store, v.customer_id)?.name || '').toLowerCase().includes(ql));
  const selV = sel && (store.vehicles || []).find(v => v.id === sel);
  const history = selV ? (store.jobCards || []).filter(j => j.vehicle_id === selV.id).sort((a, b) => b.no - a.no) : [];

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="ptitle" style={{ margin: 0 }}>Customers &amp; vehicles</h2>
        <div>
          <button className="btn ghost" onClick={() => { setShowCust(!showCust); setShowVeh(false); }}>+ Customer</button>
          <button className="btn" style={{ marginLeft: 8 }} onClick={() => { setShowVeh(!showVeh); setShowCust(false); }}>+ Vehicle</button>
        </div>
      </div>
      {showCust && <CustomerForm update={update} onDone={() => setShowCust(false)} />}
      {showVeh && <VehicleForm store={store} update={update} onDone={() => setShowVeh(false)} />}

      <input className="in" style={{ width: 300, margin: '10px 0' }} placeholder="Search plate / make / customer…" value={q} onChange={e => setQ(e.target.value)} />
      <table className="grid">
        <thead><tr><th>Plate</th><th>Vehicle</th><th>Customer</th><th>Phone</th><th>Odometer</th><th style={{ textAlign: 'right' }}>Jobs</th><th></th></tr></thead>
        <tbody>
          {vehicles.map(v => {
            const c = customer(store, v.customer_id);
            const jobs = (store.jobCards || []).filter(j => j.vehicle_id === v.id).length;
            return (
              <tr key={v.id} onClick={() => setSel(v.id)} style={{ cursor: 'pointer', background: sel === v.id ? '#eef4ff' : '' }}>
                <td><b>{v.plate}</b></td>
                <td>{v.make} {v.model} {v.year ? `(${v.year})` : ''} <span className="muted">{v.color}</span></td>
                <td>{c?.name}</td><td>{c?.phone}</td><td>{v.odometer ? Number(v.odometer).toLocaleString() + ' km' : '—'}</td>
                <td style={{ textAlign: 'right' }}>{jobs}</td>
                <td><button className="icon" title="Delete vehicle" onClick={e => { e.stopPropagation(); if (confirm('Delete this vehicle? Job history is kept.')) update(s => s.vehicles = s.vehicles.filter(x => x.id !== v.id), 'vehicle deleted'); }}>✕</button></td>
              </tr>
            );
          })}
          {!vehicles.length && <tr><td colSpan="7" className="muted">No vehicles — add a customer, then a vehicle.</td></tr>}
        </tbody>
      </table>

      {selV && (
        <div className="pcard" style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Service history — {vehicleLabel(store, selV)}</h3>
          <table className="grid">
            <thead><tr><th>Job #</th><th>Date</th><th>Work</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {history.map(j => (
                <tr key={j.id}><td>#{j.no}</td><td>{j.in_on}</td><td>{j.work || j.complaint}</td><td>{j.status}</td><td style={{ textAlign: 'right' }}>{fmt(jobTotal(store, j.id), store.settings.currency)}</td></tr>
              ))}
              {!history.length && <tr><td colSpan="5" className="muted">No previous visits.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
