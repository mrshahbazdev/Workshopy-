import { useState } from 'react';
import { uid, fmt, num, today, partStock, lowStockParts } from '../lib/model.js';
import { stockReportHtml } from '../lib/prints.js';
import { partsCsv } from '../lib/csv.js';

export default function PartsPanel({ store, update }) {
  const [showAdd, setShowAdd] = useState(false);
  const [stockIn, setStockIn] = useState(null); // part id
  const [q, setQ] = useState('');
  const [f, setF] = useState({ code: '', name: '', category: '', unit: 'pc', cost: '', price: '', low_stock: '', qty: '' });
  const [mv, setMv] = useState({ qty: '', note: '' });
  const cur = store.settings.currency;
  const ql = q.toLowerCase();
  const parts = (store.parts || []).filter(p => !q || (p.name + p.code + (p.category || '')).toLowerCase().includes(ql));
  const low = lowStockParts(store);
  const moves = (store.stockMoves || []).slice(-8).reverse();

  const addPart = () => {
    if (!f.name.trim()) return alert('Part name required');
    update(s => {
      const p = { id: uid('pt'), code: f.code || 'PT-' + String((s.parts || []).length + 1).padStart(3, '0'), name: f.name, category: f.category, unit: f.unit || 'pc', cost: num(f.cost), price: num(f.price), low_stock: num(f.low_stock) };
      s.parts.push(p);
      if (num(f.qty)) s.stockMoves.push({ id: uid('sm'), part_id: p.id, qty: num(f.qty), kind: 'in', ref: 'opening stock', note: '', at: new Date().toISOString() });
    }, 'part added');
    setF({ code: '', name: '', category: '', unit: 'pc', cost: '', price: '', low_stock: '', qty: '' });
    setShowAdd(false);
  };
  const move = (partId, sign) => {
    const qty = num(mv.qty);
    if (!qty) return;
    update(s => s.stockMoves.push({ id: uid('sm'), part_id: partId, qty: sign * qty, kind: sign > 0 ? 'in' : 'out', ref: sign > 0 ? 'purchase' : 'manual out', note: mv.note, at: new Date().toISOString() }), sign > 0 ? 'stock in' : 'stock out');
    setMv({ qty: '', note: '' }); setStockIn(null);
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="ptitle" style={{ margin: 0 }}>Parts &amp; stock</h2>
        <div>
          <button className="btn ghost" onClick={() => window.api.export.print({ html: stockReportHtml(store), suggestedName: 'workshopy-stock.pdf' })}>Print stock</button>
          <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => window.api.export.text({ text: partsCsv(store, partStock), suggestedName: 'workshopy-parts.csv' })}>CSV</button>
          <button className="btn" style={{ marginLeft: 8 }} onClick={() => setShowAdd(!showAdd)}>+ Part</button>
        </div>
      </div>

      {low.length > 0 && (
        <div className="pcard" style={{ marginTop: 10, borderLeft: '3px solid #dc2626', fontSize: 13 }}>
          <b>Low stock:</b> {low.map(p => `${p.name} (${partStock(store, p.id)} left)`).join(' · ')}
        </div>
      )}

      {showAdd && (
        <div className="pcard" style={{ marginTop: 10 }}>
          <div className="frow">
            <input className="in" style={{ width: 100 }} placeholder="Code" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} />
            <input className="in" style={{ flex: 1 }} placeholder="Part name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            <input className="in" style={{ width: 110 }} placeholder="Category" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} />
            <input className="in" style={{ width: 70 }} placeholder="Unit" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} />
          </div>
          <div className="frow">
            <label>Cost<input className="in" style={{ width: 90 }} type="number" min="0" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} /></label>
            <label>Sale price<input className="in" style={{ width: 90 }} type="number" min="0" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></label>
            <label>Low-stock alert at<input className="in" style={{ width: 80 }} type="number" min="0" value={f.low_stock} onChange={e => setF({ ...f, low_stock: e.target.value })} /></label>
            <label>Opening qty<input className="in" style={{ width: 80 }} type="number" min="0" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></label>
            <button className="btn small" onClick={addPart}>Save part</button>
          </div>
        </div>
      )}

      <input className="in" style={{ width: 300, margin: '10px 0' }} placeholder="Search parts…" value={q} onChange={e => setQ(e.target.value)} />
      <table className="grid">
        <thead><tr><th>Code</th><th>Part</th><th>Category</th><th style={{ textAlign: 'right' }}>Stock</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Stock value</th><th></th></tr></thead>
        <tbody>
          {parts.map(p => {
            const stock = partStock(store, p.id);
            const isLow = num(p.low_stock) > 0 && stock <= num(p.low_stock);
            return (
              <tr key={p.id} style={isLow ? { background: '#fef2f2' } : {}}>
                <td>{p.code}</td><td>{p.name} {isLow && <span className="chip" style={{ color: '#dc2626', cursor: 'default' }}>low</span>}</td>
                <td className="muted">{p.category}</td>
                <td style={{ textAlign: 'right' }}><b>{stock}</b> {p.unit}</td>
                <td style={{ textAlign: 'right' }}>{fmt(p.cost, cur)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(p.price, cur)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(stock * p.cost, cur)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn small ghost" onClick={() => { setStockIn(p.id); setMv({ qty: '', note: '' }); }}>± Stock</button>
                  <button className="icon" title="Delete part" onClick={() => { if (confirm('Delete this part? Stock history is kept.')) update(s => s.parts = s.parts.filter(x => x.id !== p.id), 'part deleted'); }}>✕</button>
                </td>
              </tr>
            );
          })}
          {!parts.length && <tr><td colSpan="8" className="muted">No parts yet.</td></tr>}
        </tbody>
      </table>

      {stockIn && (
        <div className="pcard" style={{ marginTop: 12 }}>
          <b>Stock move — {(store.parts || []).find(p => p.id === stockIn)?.name}</b>
          <div className="frow" style={{ marginTop: 8 }}>
            <label>Qty<input className="in" style={{ width: 90 }} type="number" min="1" value={mv.qty} onChange={e => setMv({ ...mv, qty: e.target.value })} /></label>
            <label style={{ flex: 1 }}>Note<input className="in" value={mv.note} placeholder="e.g. purchase from Autosoft" onChange={e => setMv({ ...mv, note: e.target.value })} /></label>
            <button className="btn small" onClick={() => move(stockIn, +1)}>Stock in</button>
            <button className="btn small ghost" onClick={() => move(stockIn, -1)}>Stock out</button>
            <button className="btn small ghost" onClick={() => setStockIn(null)}>✕</button>
          </div>
        </div>
      )}

      <h3 className="ptitle" style={{ marginTop: 18 }}>Recent stock moves</h3>
      <table className="grid">
        <thead><tr><th>When</th><th>Part</th><th>Move</th><th>Ref</th><th>Note</th></tr></thead>
        <tbody>
          {moves.map(m => {
            const p = (store.parts || []).find(x => x.id === m.part_id);
            return <tr key={m.id}><td>{(m.at || '').replace('T', ' ').slice(0, 16)}</td><td>{p?.name}</td>
              <td style={{ color: num(m.qty) > 0 ? '#059669' : '#dc2626' }}>{num(m.qty) > 0 ? '+' : ''}{num(m.qty)}</td>
              <td>{m.ref || m.kind}</td><td className="muted">{m.note}</td></tr>;
          })}
          {!moves.length && <tr><td colSpan="5" className="muted">No moves yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
