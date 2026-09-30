import { useState } from 'react';
import { uid, fmt, num, today, now, jobInfo, jobOutstanding, jobTotal, nextReceiptNo, receiptsOn, dayTotals, unpaidJobs } from '../lib/model.js';
import { receiptHtml, dayRegisterHtml } from '../lib/prints.js';

export default function CollectionPanel({ store, update, user }) {
  const [dateStr, setDateStr] = useState(today());
  const [form, setForm] = useState({ job_id: '', amount: '', mode: 'cash', bank_ref: '' });
  const [exp, setExp] = useState({ head: '', amount: '', note: '' });
  const cur = store.settings.currency;
  const dt = dayTotals(store, dateStr);
  const unpaid = unpaidJobs(store);
  const selJob = form.job_id && (store.jobCards || []).find(j => j.id === form.job_id);
  const selDue = selJob ? jobOutstanding(store, selJob.id) : 0;

  const receive = () => {
    if (!selJob || num(form.amount) <= 0) return alert('Job aur amount chunein');
    update(s => {
      s.receipts.push({ id: uid('rc'), no: nextReceiptNo(s), job_id: form.job_id,
        received_on: now(), amount: num(form.amount), mode: form.mode,
        bank_ref: form.bank_ref, received_by: (user && user.name) || 'owner' });
    }, `receipt job #${selJob.no}`);
    setForm({ job_id: '', amount: '', mode: 'cash', bank_ref: '' });
  };
  const addExp = () => {
    if (!exp.head.trim() || num(exp.amount) <= 0) return alert('Head + amount required');
    update(s => s.expenses.push({ id: uid('ex'), at: now(), head: exp.head, amount: num(exp.amount), note: exp.note }), 'expense');
    setExp({ head: '', amount: '', note: '' });
  };
  const reverse = (r) => {
    const reason = window.prompt('Reversal reason (required):', '');
    if (!reason) return;
    update(s => {
      const x = s.receipts.find(z => z.id === r.id);
      x.reversed_by = (user && user.name) || 'owner'; x.reverse_reason = reason; x.reversed_on = now();
    }, `receipt #${r.no} reversed`);
  };
  const printReceipt = r => window.api.export.print({ html: receiptHtml(store, r), suggestedName: `workshopy-receipt-${r.no}.pdf` });

  return (
    <div className="panel">
      <h2 className="ptitle" style={{ marginTop: 0 }}>Collection &amp; day book</h2>

      <div className="pcard" style={{ marginBottom: 14 }}>
        <b>Receive payment</b>
        <div className="frow" style={{ marginTop: 8 }}>
          <label style={{ flex: 1 }}>Job card (with balance)
            <select className="in" value={form.job_id} onChange={e => {
              const jid = e.target.value;
              const j = (store.jobCards || []).find(x => x.id === jid);
              setForm(f => ({ ...f, job_id: jid, amount: j ? jobOutstanding(store, jid) : '' }));
            }}>
              <option value="">— pick job —</option>
              {unpaid.map(j => {
                const i = jobInfo(store, j);
                return <option key={j.id} value={j.id}>#{j.no} · {i.vehicle?.plate} · {i.customer?.name} — {fmt(jobOutstanding(store, j.id), cur)}</option>;
              })}
            </select></label>
          <label>Amount<input className="in" style={{ width: 110 }} type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
          <label>Mode
            <select className="in" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
              <option>cash</option><option>bank</option><option>online</option><option>card</option>
            </select></label>
          <label>Bank ref<input className="in" style={{ width: 120 }} value={form.bank_ref} onChange={e => setForm({ ...form, bank_ref: e.target.value })} /></label>
          <button className="btn" onClick={receive}>Receive {selJob ? fmt(num(form.amount) || selDue, cur) : ''}</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
        <label className="lbl">Register date <input className="in" type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} /></label>
        <button className="btn ghost small" onClick={() => window.api.export.print({ html: dayRegisterHtml(store, dateStr, dt), suggestedName: `workshopy-day-${dateStr}.pdf` })}>Print day register</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div className="pcard"><div className="muted" style={{ fontSize: 12 }}>Receipts</div><div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(dt.sales, cur)}</div><div className="muted" style={{ fontSize: 11 }}>{Object.entries(dt.byMode).map(([k, v]) => `${k} ${num(v).toLocaleString()}`).join(' · ') || '—'}</div></div>
        <div className="pcard"><div className="muted" style={{ fontSize: 12 }}>Expenses</div><div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(dt.exp, cur)}</div></div>
        <div className="pcard"><div className="muted" style={{ fontSize: 12 }}>Net cash</div><div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(dt.net, cur)}</div></div>
      </div>

      <table className="grid">
        <thead><tr><th>Rcpt#</th><th>Time</th><th>Job</th><th>Customer</th><th>Vehicle</th><th>Mode</th><th>By</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
        <tbody>
          {dt.receipts.map(r => {
            const j = (store.jobCards || []).find(x => x.id === r.job_id) || {};
            const i = jobInfo(store, j);
            return (
              <tr key={r.id}>
                <td>#{r.no}</td><td>{(r.received_on || '').slice(11, 16)}</td><td>#{j.no}</td>
                <td>{i.customer?.name}</td><td>{i.vehicle?.plate}</td>
                <td>{r.mode}{r.bank_ref ? ` (${r.bank_ref})` : ''}</td><td>{r.received_by}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.amount, cur)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon" title="Print receipt" onClick={() => printReceipt(r)}>⎙</button>
                  <button className="icon" title="Reverse (keeps record)" onClick={() => reverse(r)}>↩</button>
                </td>
              </tr>
            );
          })}
          {!dt.receipts.length && <tr><td colSpan="9" className="muted">No receipts this day.</td></tr>}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ marginTop: 16 }}>Add expense</h3>
      <div className="frow">
        <input className="in" style={{ width: 200 }} placeholder="Head (tea, rent, salary…)" value={exp.head} onChange={e => setExp({ ...exp, head: e.target.value })} />
        <input className="in" style={{ width: 110 }} type="number" min="0" placeholder="Amount" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value })} />
        <input className="in" style={{ flex: 1 }} placeholder="Note" value={exp.note} onChange={e => setExp({ ...exp, note: e.target.value })} />
        <button className="btn small" onClick={addExp}>+ Expense</button>
      </div>
      {dt.expenses.length > 0 && (
        <table className="grid" style={{ marginTop: 8 }}>
          <tbody>{dt.expenses.map(e => <tr key={e.id}><td>{e.head}</td><td className="muted">{e.note}</td><td style={{ textAlign: 'right' }}>−{fmt(e.amount, cur)}</td></tr>)}</tbody>
        </table>
      )}

      <h3 className="ptitle" style={{ marginTop: 16 }}>Reversed receipts (never deleted)</h3>
      <table className="grid">
        <tbody>
          {(store.receipts || []).filter(r => r.reversed_by).slice(-10).map(r => (
            <tr key={r.id}><td>#{r.no}</td><td>{fmt(r.amount, cur)}</td><td className="muted">reversed by {r.reversed_by} — {r.reverse_reason}</td></tr>
          ))}
          {!(store.receipts || []).some(r => r.reversed_by) && <tr><td className="muted">None.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
