import { useMemo, useState } from 'react';
import { uid, fmt, num, today, JOB_STATUS, jobInfo, jobLines, jobSubtotal, jobTotal, jobPaid, jobOutstanding, addPartLine, removeLine, nextJobNo, vehicleLabel } from '../lib/model.js';
import { jobCardHtml, invoiceHtml, gatePassHtml } from '../lib/prints.js';

const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', ready: 'Ready', delivered: 'Delivered', cancelled: 'Cancelled' };
const NEXT = { open: 'in_progress', in_progress: 'ready', ready: 'delivered' };
const NEXT_LABEL = { open: 'Start work', in_progress: 'Mark ready', ready: 'Deliver vehicle' };

function NewJob({ store, update, onDone }) {
  const [q, setQ] = useState('');
  const matches = (store.vehicles || []).filter(v =>
    (v.plate || '').toLowerCase().includes(q.toLowerCase()) ||
    [v.make, v.model].join(' ').toLowerCase().includes(q.toLowerCase()));
  const [vehId, setVehId] = useState('');
  const [form, setForm] = useState({ km_in: '', complaint: '', work: '', mechanic_id: '', promised_on: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const create = () => {
    if (!vehId) return alert('Pehle vehicle chunein (ya Vehicles tab pe add karein)');
    update(s => {
      const v = s.vehicles.find(x => x.id === vehId);
      s.jobCards.push({
        id: uid('jc'), no: nextJobNo(s), vehicle_id: vehId, customer_id: v.customer_id,
        in_on: today(), promised_on: form.promised_on, out_on: '', status: 'open',
        km_in: form.km_in, complaint: form.complaint, work: form.work,
        mechanic_id: form.mechanic_id, discount: 0
      });
    }, 'job card opened');
    onDone();
  };
  return (
    <div className="pcard" style={{ marginBottom: 14 }}>
      <h3 style={{ marginTop: 0 }}>New job card — vehicle in</h3>
      <input className="in" style={{ width: 280, marginBottom: 8 }} placeholder="Search plate / make / model…" value={q} onChange={e => setQ(e.target.value)} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {matches.map(v => (
          <button key={v.id} className={'chip' + (vehId === v.id ? ' on' : '')} onClick={() => setVehId(v.id)}>
            {v.plate} · {v.make} {v.model}
          </button>
        ))}
        {!matches.length && <span className="muted">No matching vehicle — add it in the Vehicles tab first.</span>}
      </div>
      <div className="frow">
        <label>Odometer (km)<input className="in" style={{ width: 110 }} value={form.km_in} onChange={e => set('km_in', e.target.value)} /></label>
        <label>Promised on<input className="in" type="date" value={form.promised_on} onChange={e => set('promised_on', e.target.value)} /></label>
        <label>Mechanic
          <select className="in" value={form.mechanic_id} onChange={e => set('mechanic_id', e.target.value)}>
            <option value="">— assign later —</option>
            {(store.mechanics || []).filter(m => m.status !== 'left').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select></label>
      </div>
      <div className="frow">
        <label style={{ flex: 1 }}>Customer complaint<input className="in" value={form.complaint} onChange={e => set('complaint', e.target.value)} placeholder="e.g. brake noise, engine overheating…" /></label>
      </div>
      <div className="frow">
        <label style={{ flex: 1 }}>Work requested / diagnosis<input className="in" value={form.work} onChange={e => set('work', e.target.value)} placeholder="e.g. full service, front brake pads" /></label>
      </div>
      <button className="btn" onClick={create}>Open job card</button>
      <button className="btn ghost" style={{ marginLeft: 8 }} onClick={onDone}>Cancel</button>
    </div>
  );
}

function JobDetail({ store, update, job }) {
  const info = jobInfo(store, job);
  const lines = jobLines(store, job.id);
  const [partPick, setPartPick] = useState({ part_id: '', qty: 1, rate: '' });
  const [lab, setLab] = useState({ description: '', qty: 1, rate: '' });
  const cur = store.settings.currency;
  const closed = ['delivered', 'cancelled'].includes(job.status);
  const p = partPick.part_id && (store.parts || []).find(x => x.id === partPick.part_id);

  const print = html => window.api.export.print({ html, suggestedName: `workshopy-job-${job.no}.pdf` });
  const addPart = () => {
    if (!partPick.part_id || num(partPick.qty) <= 0) return;
    update(s => { addPartLine(s, job.id, partPick.part_id, num(partPick.qty), partPick.rate === '' ? undefined : num(partPick.rate)); }, 'part added');
    setPartPick({ part_id: '', qty: 1, rate: '' });
  };
  const addLabor = () => {
    if (!lab.description || num(lab.rate) <= 0) return;
    update(s => s.jobLines.push({ id: uid('jl'), job_id: job.id, kind: 'labor', part_id: '', description: lab.description, qty: num(lab.qty) || 1, rate: num(lab.rate) }), 'labor added');
    setLab({ description: '', qty: 1, rate: '' });
  };
  const setStatus = (st) => update(s => {
    const j = s.jobCards.find(x => x.id === job.id);
    j.status = st;
    if (st === 'delivered' && !j.out_on) j.out_on = today();
  }, `job #${job.no} → ${st}`);
  const cancel = () => {
    const reason = window.prompt('Cancel reason (required):', '');
    if (!reason) return;
    update(s => {
      const j = s.jobCards.find(x => x.id === job.id);
      j.status = 'cancelled'; j.cancel_reason = reason;
      // return any parts taken for this job
      for (const l of (s.jobLines || []).filter(x => x.job_id === job.id && x.kind === 'part' && x.part_id)) {
        s.stockMoves.push({ id: uid('sm'), part_id: l.part_id, qty: num(l.qty), kind: 'adjust', ref: `job #${j.no} cancelled`, note: l.description, at: new Date().toISOString() });
      }
    }, `job #${job.no} cancelled`);
  };

  return (
    <div className="pcard" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0 }}>Job card #{job.no} — {info.vehicleLabel}</h3>
          <div className="muted" style={{ marginTop: 3 }}>
            {info.customer?.name} {info.customer?.phone ? '· ' + info.customer.phone : ''} · in {job.in_on}
            {job.km_in ? ` · ${job.km_in} km` : ''} · {info.mechanic?.name ? `mechanic: ${info.mechanic.name}` : 'mechanic: —'}
          </div>
        </div>
        <div>
          <span className={'st-' + (job.status === 'delivered' ? 'paid' : job.status === 'ready' ? 'partial' : job.status === 'cancelled' ? 'void' : 'sent')} style={{ fontSize: 13 }}>{STATUS_LABEL[job.status]}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div className="pcard" style={{ padding: 10, fontSize: 13 }}><b>Complaint</b><div>{job.complaint || '—'}</div></div>
        <div className="pcard" style={{ padding: 10, fontSize: 13 }}><b>Work</b><div>{job.work || '—'}</div></div>
      </div>

      <table className="grid" style={{ marginTop: 12 }}>
        <thead><tr><th>Item</th><th>Kind</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.id}>
              <td>{l.description}</td>
              <td><span className="chip" style={{ cursor: 'default' }}>{l.kind}</span></td>
              <td style={{ textAlign: 'right' }}>{num(l.qty)}</td>
              <td style={{ textAlign: 'right' }}>{num(l.rate).toLocaleString()}</td>
              <td style={{ textAlign: 'right' }}>{(num(l.qty) * num(l.rate)).toLocaleString()}</td>
              <td>{!closed && <button className="icon" title="Remove (returns stock)" onClick={() => update(s => removeLine(s, l.id), 'line removed')}>✕</button>}</td>
            </tr>
          ))}
          {!lines.length && <tr><td colSpan="6" className="muted">No parts or labor yet.</td></tr>}
        </tbody>
      </table>

      {!closed && (
        <div className="frow" style={{ marginTop: 10 }}>
          <label>Part
            <select className="in" value={partPick.part_id} onChange={e => {
              const pid = e.target.value;
              const pp = (store.parts || []).find(x => x.id === pid);
              setPartPick(x => ({ ...x, part_id: pid, rate: pp ? pp.price : '' }));
            }}>
              <option value="">— pick part —</option>
              {(store.parts || []).map(x => <option key={x.id} value={x.id}>{x.name} ({fmt(x.price, cur)})</option>)}
            </select></label>
          <label>Qty<input className="in" style={{ width: 70 }} type="number" min="1" value={partPick.qty} onChange={e => setPartPick(x => ({ ...x, qty: e.target.value }))} /></label>
          <label>Rate<input className="in" style={{ width: 90 }} type="number" min="0" value={partPick.rate} onChange={e => setPartPick(x => ({ ...x, rate: e.target.value }))} /></label>
          <button className="btn small" onClick={addPart}>+ Part</button>
          <span className="muted">|</span>
          <label style={{ flex: 1 }}>Labor<input className="in" value={lab.description} placeholder="e.g. brake service" onChange={e => setLab(x => ({ ...x, description: e.target.value }))} /></label>
          <label>Rate<input className="in" style={{ width: 90 }} type="number" min="0" value={lab.rate} onChange={e => setLab(x => ({ ...x, rate: e.target.value }))} /></label>
          <button className="btn small" onClick={addLabor}>+ Labor</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 8, fontSize: 14 }}>
        <span>Subtotal <b>{fmt(jobSubtotal(store, job.id), cur)}</b></span>
        {num(store.settings.taxRate) > 0 && <span>Tax {num(store.settings.taxRate)}%</span>}
        <span>Discount <input className="in" style={{ width: 80 }} type="number" min="0" value={job.discount || 0} disabled={closed}
          onChange={e => update(s => { s.jobCards.find(x => x.id === job.id).discount = num(e.target.value); }, 'discount')} /></span>
        <span>Total <b>{fmt(jobTotal(store, job.id), cur)}</b></span>
        <span>Paid <b>{fmt(jobPaid(store, job.id), cur)}</b></span>
        <span style={{ color: jobOutstanding(store, job.id) ? '#dc2626' : '#059669' }}>Balance <b>{fmt(jobOutstanding(store, job.id), cur)}</b></span>
      </div>

      <div className="row" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {NEXT[job.status] && <button className="btn" onClick={() => setStatus(NEXT[job.status])}>{NEXT_LABEL[job.status]}</button>}
        <button className="btn ghost" onClick={() => print(jobCardHtml(store, job))}>Print job card</button>
        <button className="btn ghost" onClick={() => print(invoiceHtml(store, job))}>Print invoice</button>
        {(job.status === 'ready' || job.status === 'delivered') && <button className="btn ghost" onClick={() => print(gatePassHtml(store, job))}>Gate pass</button>}
        {!closed && <button className="btn ghost" style={{ color: '#dc2626' }} onClick={cancel}>Cancel job</button>}
      </div>
    </div>
  );
}

export default function JobCardsPanel({ store, update }) {
  const [showNew, setShowNew] = useState(false);
  const [sel, setSel] = useState(null);
  const [flt, setFlt] = useState('open');
  const jobs = useMemo(() => {
    const arr = [...(store.jobCards || [])].sort((a, b) => b.no - a.no);
    if (flt === 'all') return arr;
    if (flt === 'open') return arr.filter(j => ['open', 'in_progress', 'ready'].includes(j.status));
    return arr.filter(j => j.status === flt);
  }, [store.jobCards, flt]);
  const selJob = sel && (store.jobCards || []).find(j => j.id === sel);
  const cur = store.settings.currency;

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="ptitle" style={{ margin: 0 }}>Job cards</h2>
        <button className="btn" onClick={() => { setShowNew(true); setSel(null); }}>+ New job card</button>
      </div>
      {showNew && <NewJob store={store} update={update} onDone={() => setShowNew(false)} />}

      <div className="filters" style={{ margin: '12px 0' }}>
        {[['open', 'Inside (open/working/ready)'], ['in_progress', 'In progress'], ['ready', 'Ready'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([k, l]) => (
          <button key={k} className={'chip' + (flt === k ? ' on' : '')} onClick={() => setFlt(k)}>{l}</button>
        ))}
      </div>

      <table className="grid">
        <thead><tr><th>Job #</th><th>In</th><th>Vehicle</th><th>Customer</th><th>Complaint</th><th>Mechanic</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
        <tbody>
          {jobs.map(j => {
            const i = jobInfo(store, j);
            return (
              <tr key={j.id} onClick={() => { setSel(j.id); setShowNew(false); }} style={{ cursor: 'pointer', background: sel === j.id ? '#eef4ff' : '' }}>
                <td>#{j.no}</td><td>{j.in_on}</td>
                <td><b>{i.vehicle?.plate}</b> <span className="muted">{i.vehicle?.model}</span></td>
                <td>{i.customer?.name}</td>
                <td className="muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.complaint}</td>
                <td>{i.mechanic?.name || '—'}</td>
                <td>{STATUS_LABEL[j.status]}</td>
                <td style={{ textAlign: 'right' }}>{fmt(jobTotal(store, j.id), cur)}</td>
                <td style={{ textAlign: 'right', color: jobOutstanding(store, j.id) ? '#dc2626' : 'inherit' }}>{fmt(jobOutstanding(store, j.id), cur)}</td>
              </tr>
            );
          })}
          {!jobs.length && <tr><td colSpan="9" className="muted">No job cards here.</td></tr>}
        </tbody>
      </table>

      {selJob && <JobDetail store={store} update={update} job={selJob} />}
    </div>
  );
}
