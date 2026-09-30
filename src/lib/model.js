// Workshop document model — job cards, parts & labor, payments.
// Design rules:
// - receipts are never deleted: a mistake is a reversal row with a reason.
// - job card numbers are gap-free, allocated at issue time.
// - part stock only moves through stockMoves (an append-only ledger).

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 10);
export const fmt = (n, cur = 'Rs') => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export const day = iso => (iso || '').slice(0, 10);
export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toISOString();

export const ROLES = {
  owner: 'Owner — full access',
  manager: 'Manager — jobs, parts, money',
  mechanic: 'Mechanic — own job cards, no money',
  clerk: 'Clerk — vehicles & job intake, no money'
};

export const JOB_STATUS = ['open', 'in_progress', 'ready', 'delivered', 'cancelled'];

export function emptyStore() {
  return {
    version: 1,
    customers: [],   // {id, name, phone, address, notes}
    vehicles: [],    // {id, customer_id, plate, make, model, year, color, odometer, notes}
    mechanics: [],   // {id, name, role, phone, status}
    parts: [],       // {id, code, name, category, unit, cost, price, low_stock}
    stockMoves: [],  // {id, part_id, qty, kind:'in'|'out'|'job'|'adjust', ref, note, at}
    jobCards: [],    // {id, no, vehicle_id, customer_id, in_on, promised_on, out_on, status, km_in, complaint, work, mechanic_id, discount}
    jobLines: [],    // {id, job_id, kind:'part'|'labor', part_id, description, qty, rate}
    receipts: [],    // {id, no, job_id, received_on, amount, mode, bank_ref, received_by, reversed_by, reverse_reason}
    expenses: [],    // {id, at, head, amount, note}
    auditLog: [],
    settings: defaultSettings(),
    updatedAt: Date.now()
  };
}

export function defaultSettings() {
  return {
    shopName: '', shopAddress: '', shopPhone: '',
    currency: 'Rs',
    invoiceFooter: 'Barah-e-karam kaam delivery ke waqt check kar lein. Parts ki warranty manufacturer ki sharten laagu hain.',
    letterheadOffset: 0,
    taxRate: 0,              // % sales tax on labor+parts, 0 = no tax line
    users: [],               // {id, name, role, pin:'s:salt:hash'}
    backupFolder: '', lastBackupAt: '',
    syncFolder: '', syncAuto: true, syncCode: '', hostOn: false,
    uiUrdu: false, printUrdu: true,
    firstRunDone: false, consent: null
  };
}

// ---------- lookups ----------
export const customer = (s, id) => (s.customers || []).find(c => c.id === id) || null;
export const vehicle = (s, id) => (s.vehicles || []).find(v => v.id === id) || null;
export const mechanic = (s, id) => (s.mechanics || []).find(m => m.id === id) || null;
export const part = (s, id) => (s.parts || []).find(p => p.id === id) || null;
export const jobCard = (s, id) => (s.jobCards || []).find(j => j.id === id) || null;

export function vehicleLabel(store, v) {
  if (!v) return '';
  return [v.plate, [v.make, v.model, v.year].filter(Boolean).join(' ')].filter(Boolean).join(' — ');
}
export function jobInfo(store, j) {
  const v = vehicle(store, j.vehicle_id);
  const c = customer(store, j.customer_id) || (v && customer(store, v.customer_id));
  const m = mechanic(store, j.mechanic_id);
  return { vehicle: v, customer: c, mechanic: m, vehicleLabel: vehicleLabel(store, v) };
}
export function jobLines(store, jobId) {
  return (store.jobLines || []).filter(l => l.job_id === jobId);
}
export function jobSubtotal(store, jobId) {
  return jobLines(store, jobId).reduce((t, l) => t + num(l.qty) * num(l.rate), 0);
}
export function jobTotal(store, jobId) {
  const j = jobCard(store, jobId);
  const sub = jobSubtotal(store, jobId);
  const tax = Math.round(sub * num(store.settings?.taxRate) / 100);
  return Math.max(0, sub + tax - num(j && j.discount));
}
export function jobPaid(store, jobId) {
  return (store.receipts || []).filter(r => r.job_id === jobId && !r.reversed_by)
    .reduce((t, r) => t + num(r.amount), 0);
}
export function jobOutstanding(store, jobId) {
  return Math.max(0, jobTotal(store, jobId) - jobPaid(store, jobId));
}
export const nextJobNo = s => (s.jobCards || []).reduce((m, j) => Math.max(m, num(j.no)), 0) + 1;
export const nextReceiptNo = s => (s.receipts || []).reduce((m, r) => Math.max(m, num(r.no)), 0) + 1;

// ---------- stock ----------
export function partStock(store, partId) {
  return (store.stockMoves || []).filter(m => m.part_id === partId)
    .reduce((t, m) => t + num(m.qty), 0);
}
export function lowStockParts(store) {
  return (store.parts || []).filter(p => num(p.low_stock) > 0 && partStock(store, p.id) <= num(p.low_stock));
}
// Add a part line to a job AND post its stock-out move in one update (same store copy).
export function addPartLine(store, jobId, partId, qty, rate) {
  const p = part(store, partId);
  if (!p || num(qty) <= 0) return null;
  const line = { id: uid('jl'), job_id: jobId, kind: 'part', part_id: partId, description: p.name, qty: num(qty), rate: rate === undefined ? num(p.price) : num(rate) };
  store.jobLines.push(line);
  store.stockMoves.push({ id: uid('sm'), part_id: partId, qty: -num(qty), kind: 'job', ref: `job #${(jobCard(store, jobId) || {}).no || ''}`, note: '', at: now() });
  return line;
}
export function removeLine(store, lineId) {
  const i = (store.jobLines || []).findIndex(l => l.id === lineId);
  if (i < 0) return;
  const l = store.jobLines[i];
  if (l.kind === 'part' && l.part_id) {
    // reverse the stock move so inventory stays exact
    store.stockMoves.push({ id: uid('sm'), part_id: l.part_id, qty: num(l.qty), kind: 'adjust', ref: 'line removed', note: l.description, at: now() });
  }
  store.jobLines.splice(i, 1);
}

// ---------- money register ----------
export function receiptsOn(store, dateStr) {
  return (store.receipts || []).filter(r => day(r.received_on) === dateStr && !r.reversed_by);
}
export function expensesOn(store, dateStr) {
  return (store.expenses || []).filter(e => day(e.at) === dateStr);
}
export function dayTotals(store, dateStr) {
  const rs = receiptsOn(store, dateStr);
  const ex = expensesOn(store, dateStr);
  const byMode = {};
  for (const r of rs) byMode[r.mode || 'cash'] = (byMode[r.mode || 'cash'] || 0) + num(r.amount);
  const sales = rs.reduce((t, r) => t + num(r.amount), 0);
  const exp = ex.reduce((t, e) => t + num(e.amount), 0);
  return { receipts: rs, expenses: ex, byMode, sales, exp, net: sales - exp };
}

// ---------- reports ----------
export function unpaidJobs(store) {
  return (store.jobCards || []).filter(j => !['cancelled'].includes(j.status) && jobOutstanding(store, j.id) > 0);
}
export function openJobs(store) {
  return (store.jobCards || []).filter(j => ['open', 'in_progress', 'ready'].includes(j.status));
}
export function mechanicTotals(store, from, to) {
  const out = {};
  for (const j of store.jobCards || []) {
    if (j.status === 'cancelled' || !j.mechanic_id) continue;
    const d = day(j.in_on);
    if (from && d < from) continue;
    if (to && d > to) continue;
    const m = mechanic(store, j.mechanic_id);
    const labor = jobLines(store, j.id).filter(l => l.kind === 'labor').reduce((t, l) => t + num(l.qty) * num(l.rate), 0);
    const e = out[j.mechanic_id] || (out[j.mechanic_id] = { name: (m && m.name) || '?', jobs: 0, labor: 0 });
    e.jobs++; e.labor += labor;
  }
  return Object.values(out).sort((a, b) => b.labor - a.labor);
}
export function grossProfit(store, from, to) {
  let revenue = 0, cost = 0;
  for (const j of store.jobCards || []) {
    if (j.status === 'cancelled') continue;
    const d = day(j.in_on);
    if (from && d < from) continue;
    if (to && d > to) continue;
    for (const l of jobLines(store, j.id)) {
      revenue += num(l.qty) * num(l.rate);
      if (l.kind === 'part' && l.part_id) cost += num(l.qty) * num((part(store, l.part_id) || {}).cost);
    }
  }
  return { revenue, cost, profit: revenue - cost };
}

// ---------- sample data (fictional) ----------
export function sampleStore() {
  const s = emptyStore();
  const st = s.settings;
  st.shopName = 'Al-Falah Auto Workshop';
  st.shopAddress = 'Plot 14, Service Road, Sector G-9, Islamabad';
  st.shopPhone = '051-2233445';
  const cust = (name, phone, address = '') => { const c = { id: uid('cu'), name, phone, address, notes: '' }; s.customers.push(c); return c; };
  const veh = (c, plate, make, model, year, color, odometer) => { const v = { id: uid('vh'), customer_id: c.id, plate, make, model, year, color, odometer, notes: '' }; s.vehicles.push(v); return v; };
  const mech = (name, role, phone) => { const m = { id: uid('mc'), name, role, phone, status: 'active' }; s.mechanics.push(m); return m; };
  const prt = (code, name, category, unit, cost, price, low, qty) => {
    const p = { id: uid('pt'), code, name, category, unit, cost, price, low_stock: low };
    s.parts.push(p);
    if (qty) s.stockMoves.push({ id: uid('sm'), part_id: p.id, qty, kind: 'in', ref: 'opening stock', note: '', at: now() });
    return p;
  };
  const c1 = cust('Imran Bhatti', '0301-5551234', 'House 22, G-9/1');
  const c2 = cust('Sadia Khanum', '0333-7819200', 'Flat 4B, F-10 Markaz');
  const c3 = cust('Malik Tariq Mehmood', '0345-1110293', 'Peshawar Road, Rawalpindi');
  cust('Rabia Anwar', '0321-4400887', 'I-8/3, Islamabad');
  const v1 = veh(c1, 'ICT-4821', 'Toyota', 'Corolla GLi', 2019, 'White', 74500);
  const v2 = veh(c2, 'ISB-9034', 'Honda', 'City', 2021, 'Silver', 31200);
  const v3 = veh(c3, 'RIL-3310', 'Suzuki', 'Cultus VXL', 2018, 'Grey', 98200);
  const v4 = veh(c3, 'RIL-5520', 'Toyota', 'Hilux Revo', 2022, 'Black', 41000);
  veh(c1, 'LEA-7712', 'Suzuki', 'Mehran', 2014, 'Blue', 156000);
  const m1 = mech('Ustad Rashid', 'Senior mechanic', '0300-1112233');
  const m2 = mech('Adnan Yousaf', 'Mechanic', '0311-4455667');
  mech('Shahbaz Electrician', 'Auto-electrician', '0322-9900112');
  const pOil = prt('OL-5W30', 'Engine oil 5W-30 (4L)', 'Lubricants', 'tin', 4200, 5600, 4, 18);
  const pFlt = prt('FLT-TCO', 'Oil filter — Corolla/City', 'Filters', 'pc', 380, 650, 6, 24);
  const pAir = prt('FLT-AIR', 'Air filter (universal)', 'Filters', 'pc', 620, 950, 5, 14);
  const pPad = prt('BRK-PAD', 'Brake pads set (front)', 'Brakes', 'set', 2100, 3400, 4, 9);
  const pPlg = prt('IGN-PLG', 'Spark plug (NGK)', 'Ignition', 'pc', 420, 700, 8, 40);
  prt('CLT-GRN', 'Coolant 1L', 'Fluids', 'btl', 350, 550, 6, 12);
  prt('BLB-H4', 'Headlight bulb H4', 'Electrical', 'pc', 480, 800, 4, 3);

  const job = (v, n, inOn, prom, status, km, complaint, work, mechId, disc, outOn) => {
    const j = { id: uid('jc'), no: n, vehicle_id: v.id, customer_id: v.customer_id, in_on: inOn, promised_on: prom, out_on: outOn || '', status, km_in: km, complaint, work, mechanic_id: mechId, discount: disc || 0 };
    s.jobCards.push(j); return j;
  };
  const lab = (j, desc, qty, rate) => s.jobLines.push({ id: uid('jl'), job_id: j.id, kind: 'labor', part_id: '', description: desc, qty, rate });
  const d = today();
  const j1 = job(v1, 1, d, d, 'in_progress', 74500, 'Engine oil due + brake noise at low speed', 'Oil service + brake inspection', m1.id, 0);
  addPartLine(s, j1.id, pOil.id, 1); addPartLine(s, j1.id, pFlt.id, 1);
  lab(j1, 'Oil change + service labor', 1, 1500);
  const j2 = job(v2, 2, d, d, 'ready', 31200, 'Brakes grinding; front pads worn', 'Replace front brake pads', m2.id, 200);
  addPartLine(s, j2.id, pPad.id, 1);
  lab(j2, 'Brake pad replacement labor', 1, 1200);
  const j3 = job(v3, 3, d, d, 'delivered', 98200, 'Tuning — plugs & filters', 'Full tune-up', m2.id, 0, d);
  addPartLine(s, j3.id, pPlg.id, 4); addPartLine(s, j3.id, pAir.id, 1);
  lab(j3, 'Tune-up labor', 1, 2500);
  s.receipts.push({ id: uid('rc'), no: 1, job_id: j3.id, received_on: d + 'T11:20:00', amount: jobTotal(s, j3.id), mode: 'cash', bank_ref: '', received_by: 'Owner' });
  job(v4, 4, d, '', 'open', 41000, 'AC not cooling — gas check', 'AC diagnosis', m1.id, 0);
  s.expenses.push({ id: uid('ex'), at: d + 'T10:05:00', head: 'Tea & refreshment', amount: 450, note: '' });
  s.auditLog.push({ at: now(), user: 'app', what: 'sample data loaded' });
  s.updatedAt = Date.now();
  return s;
}
