// Print HTML: job card estimate, invoice, payment receipt, gate pass, day register.
import { fmt, num, today, jobInfo, jobLines, jobSubtotal, jobTotal, jobPaid, jobOutstanding, part } from './model.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function head(store, offsetMm) {
  const s = store.settings;
  return `
    <div class="sch-head" style="padding-top:${num(offsetMm)}mm">
      ${s.shopName ? `<div class="sch-name">${esc(s.shopName)}</div>` : ''}
      <div class="sch-sub">${esc(s.shopAddress || '')} ${s.shopPhone ? ' · ' + esc(s.shopPhone) : ''}</div>
    </div>`;
}

const baseCss = `
  body{font:9.5pt 'Segoe UI',sans-serif;color:#111}
  .sch-head{text-align:center;margin-bottom:2mm}
  .sch-name{font-size:13pt;font-weight:700}
  .sch-sub{font-size:8pt;color:#444}
  table{width:100%;border-collapse:collapse}
  .meta td{padding:1mm .5mm;font-size:9pt;border:none}
  .lines td,.lines th{border:1px solid #999;padding:1.4mm 2mm;font-size:9pt}
  .lines th{background:#eef2f7;text-align:left}
  .r{text-align:right}
  .sign{display:flex;justify-content:space-between;margin:9mm 2mm 0;font-size:8pt;color:#444}
  .sign span{border-top:1px solid #555;padding-top:1mm;min-width:22mm;text-align:center}
  .foot{text-align:center;font-size:7.5pt;color:#555;margin-top:3mm}`;

function linesTable(store, j, s) {
  const lines = jobLines(store, j.id);
  const rows = lines.map(l => {
    const unit = l.kind === 'part' ? 'Part' : 'Labor';
    return `<tr><td>${esc(l.description)}<div class="kind">${unit}</div></td><td class="r">${num(l.qty)}</td><td class="r">${num(l.rate).toLocaleString()}</td><td class="r">${(num(l.qty) * num(l.rate)).toLocaleString()}</td></tr>`;
  }).join('');
  const sub = jobSubtotal(store, j.id);
  const tax = Math.round(sub * num(s.taxRate) / 100);
  return `
    <table class="lines"><thead><tr><th>Particulars</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount (${esc(s.currency || 'Rs')})</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <table class="tot"><tbody>
      <tr><td>Subtotal</td><td class="r">${sub.toLocaleString()}</td></tr>
      ${tax ? `<tr><td>Sales tax (${num(s.taxRate)}%)</td><td class="r">${tax.toLocaleString()}</td></tr>` : ''}
      ${num(j.discount) ? `<tr><td>Discount</td><td class="r">−${num(j.discount).toLocaleString()}</td></tr>` : ''}
      <tr class="grand"><td><b>Total</b></td><td class="r"><b>${jobTotal(store, j.id).toLocaleString()}</b></td></tr>
      <tr><td>Paid</td><td class="r">${jobPaid(store, j.id).toLocaleString()}</td></tr>
      <tr><td><b>Balance</b></td><td class="r"><b>${jobOutstanding(store, j.id).toLocaleString()}</b></td></tr>
    </tbody></table>`;
}

export function jobCardHtml(store, j) {
  const info = jobInfo(store, j);
  const s = store.settings;
  return `<!doctype html><html><head><style>
    @page{size:A4;margin:12mm}
    ${baseCss}
    .box{border:1.2px solid #555;padding:2.5mm 3mm;margin-top:2.5mm;min-height:22mm}
    .lbl{font-size:7.5pt;color:#555;text-transform:uppercase;letter-spacing:.05em}
    .tot td{padding:1mm 2mm;font-size:9.5pt}
    .grand td{border-top:1.5px solid #333}
  </style></head><body>
    ${head(store, s.letterheadOffset)}
    <table class="meta"><tr>
      <td><b>Job card #</b> ${j.no}</td><td><b>In</b> ${esc(j.in_on || '')}</td>
      <td><b>Promised</b> ${esc(j.promised_on || '—')}</td><td class="r"><b>KM</b> ${esc(j.km_in || '—')}</td>
    </tr><tr>
      <td colspan="2"><b>${esc(info.vehicleLabel)}</b>${info.vehicle && info.vehicle.color ? ' · ' + esc(info.vehicle.color) : ''}</td>
      <td><b>Customer</b> ${esc(info.customer?.name || '—')}</td><td class="r"><b>Phone</b> ${esc(info.customer?.phone || '')}</td>
    </tr><tr>
      <td colspan="2"><b>Mechanic</b> ${esc(info.mechanic?.name || '—')}</td>
      <td colspan="2" class="r"><b>Status</b> ${esc(j.status)}</td>
    </tr></table>
    <div class="box"><div class="lbl">Customer complaint — شکایت</div>${esc(j.complaint || '')}</div>
    <div class="box"><div class="lbl">Work requested / diagnosis</div>${esc(j.work || '')}</div>
    <div class="lbl" style="margin-top:3mm">Estimate — parts &amp; labor</div>
    ${linesTable(store, j, s)}
    <div class="sign"><span>Customer sign</span><span>Service advisor</span><span>Workshop</span></div>
    <div class="foot">${esc(s.invoiceFooter || '')} · Workshopy</div>
  </body></html>`;
}

export function invoiceHtml(store, j) {
  const info = jobInfo(store, j);
  const s = store.settings;
  return `<!doctype html><html><head><style>
    @page{size:A4;margin:12mm}
    ${baseCss}
    .tot td{padding:1mm 2mm;font-size:9.5pt}
    .grand td{border-top:1.5px solid #333}
    .ur{direction:rtl;text-align:center;font-size:8.5pt;color:#444;margin-top:2mm}
  </style></head><body>
    ${head(store, s.letterheadOffset)}
    <table class="meta"><tr>
      <td><b>Invoice #</b> ${j.no}</td><td><b>Date</b> ${esc(j.out_on || today())}</td>
      <td><b>Vehicle in</b> ${esc(j.in_on || '')}</td><td class="r"><b>KM</b> ${esc(j.km_in || '—')}</td>
    </tr><tr>
      <td colspan="2"><b>${esc(info.vehicleLabel)}</b></td>
      <td><b>Customer</b> ${esc(info.customer?.name || '—')}</td><td class="r"><b>Phone</b> ${esc(info.customer?.phone || '')}</td>
    </tr><tr>
      <td colspan="2"><b>Work done</b> ${esc(j.work || '')}</td>
      <td colspan="2" class="r"><b>Mechanic</b> ${esc(info.mechanic?.name || '—')}</td>
    </tr></table>
    ${linesTable(store, j, s)}
    ${s.printUrdu ? `<div class="ur">وصول شدہ رقم کی تصدیق کریں — پارٹس کی وارنٹی کمپنی کی شرائط کے تابع ہے۔</div>` : ''}
    <div class="sign"><span>Received by</span><span>Customer sign</span><span>Workshop stamp</span></div>
    <div class="foot">${esc(s.invoiceFooter || '')} · Workshopy</div>
  </body></html>`;
}

export function receiptHtml(store, receipt) {
  const j = (store.jobCards || []).find(c => c.id === receipt.job_id) || {};
  const info = jobInfo(store, j);
  const s = store.settings;
  return `<!doctype html><html><head><style>
    @page{size:80mm auto;margin:6mm}
    body{font:9pt 'Segoe UI',sans-serif;color:#111;width:68mm}
    .sch-name{font-size:11pt;font-weight:700;text-align:center}
    .sch-sub{text-align:center;font-size:7.5pt;color:#444;margin-bottom:4mm}
    table{width:100%;border-collapse:collapse;margin-top:3mm}
    td{padding:1.4mm .5mm;border-bottom:1px dashed #cbd5e1;font-size:9pt}
    .r{text-align:right}
    .big{font-size:11.5pt;font-weight:700}
    .foot{margin-top:5mm;text-align:center;font-size:7.5pt;color:#666}
  </style></head><body>
    <div class="sch-name">${esc(s.shopName || 'Workshop')}</div>
    <div class="sch-sub">${esc(s.shopAddress || '')} ${s.shopPhone ? ' · ' + esc(s.shopPhone) : ''}</div>
    <div style="text-align:center;font-weight:700">PAYMENT RECEIPT — رسید</div>
    <table>
      <tr><td>Receipt #</td><td class="r"><b>${receipt.no}</b></td></tr>
      <tr><td>Date</td><td class="r">${esc(receipt.received_on.slice(0, 16).replace('T', ' '))}</td></tr>
      <tr><td>Customer</td><td class="r">${esc(info.customer?.name || '')}</td></tr>
      <tr><td>Vehicle</td><td class="r">${esc(info.vehicleLabel || '')}</td></tr>
      <tr><td>Job #</td><td class="r">${j.no || '—'}</td></tr>
      <tr><td>Mode</td><td class="r">${esc(receipt.mode || 'cash')}${receipt.bank_ref ? ' · ' + esc(receipt.bank_ref) : ''}</td></tr>
      <tr><td class="big">Received</td><td class="r big">${fmt(receipt.amount, s.currency)}</td></tr>
      <tr><td>Remaining balance</td><td class="r">${fmt(jobOutstanding(store, j.id), s.currency)}</td></tr>
    </table>
    <div class="foot">${esc(s.invoiceFooter || '')}<br>Workshopy — offline</div>
  </body></html>`;
}

export function gatePassHtml(store, j) {
  const info = jobInfo(store, j);
  const s = store.settings;
  return `<!doctype html><html><head><style>
    @page{size:A5;margin:10mm}
    ${baseCss}
    .gt{border:2.5px solid #0c1c33;padding:5mm;margin-top:3mm}
    .plate{font-size:16pt;font-weight:800;letter-spacing:.08em;text-align:center}
    .lbl{font-size:7.5pt;color:#555;text-transform:uppercase}
  </style></head><body>
    ${head(store, s.letterheadOffset)}
    <div class="gt">
      <div class="lbl" style="text-align:center">GATE PASS — گاڑی روانگی اجازت نامہ</div>
      <div class="plate">${esc(info.vehicle?.plate || '—')}</div>
      <table class="meta"><tr><td><b>Vehicle</b> ${esc(info.vehicleLabel)}</td><td class="r"><b>Job #</b> ${j.no}</td></tr>
      <tr><td><b>Customer</b> ${esc(info.customer?.name || '—')}</td><td class="r"><b>Out</b> ${esc(j.out_on || today())}</td></tr>
      <tr><td><b>Balance due</b></td><td class="r"><b>${fmt(jobOutstanding(store, j.id), s.currency)}</b></td></tr></table>
      <div class="sign"><span>Guard</span><span>Service advisor</span><span>Workshop</span></div>
    </div>
    <div class="foot">Vehicle may leave after this pass is signed. · Workshopy</div>
  </body></html>`;
}

export function dayRegisterHtml(store, dateStr, dt) {
  const s = store.settings;
  const rows = dt.receipts.map(r => {
    const j = (store.jobCards || []).find(x => x.id === r.job_id) || {};
    const info = jobInfo(store, j);
    return `<tr><td>${r.no}</td><td>${esc(r.received_on.slice(11, 16) || '')}</td><td>${esc(info.customer?.name || '')}</td><td>${esc(info.vehicle?.plate || '')}</td><td>Job #${j.no || ''}</td><td>${esc(r.mode || 'cash')}</td><td class="r">${num(r.amount).toLocaleString()}</td></tr>`;
  }).join('');
  const exrows = dt.expenses.map(e => `<tr><td colspan="2"></td><td colspan="3">Expense — ${esc(e.head)}${e.note ? ' (' + esc(e.note) + ')' : ''}</td><td>—</td><td class="r">−${num(e.amount).toLocaleString()}</td></tr>`).join('');
  const modes = Object.entries(dt.byMode).map(([k, v]) => `${esc(k)}: ${num(v).toLocaleString()}`).join(' · ');
  return `<!doctype html><html><head><style>
    @page{size:A4;margin:12mm}
    body{font:9.5pt 'Segoe UI',sans-serif}
    .sch-name{font-size:13pt;font-weight:700;text-align:center}
    .sub{text-align:center;font-size:8.5pt;color:#555;margin-bottom:4mm}
    table{width:100%;border-collapse:collapse} td,th{border:1px solid #cbd5e1;padding:1.4mm 2mm;text-align:left;font-size:9pt}
    th{background:#0c1c33;color:#fff}.r{text-align:right}
    .tot td{font-weight:700;border-top:1.5px solid #333}
    .foot{margin-top:4mm;font-size:8pt;color:#666;text-align:center}
  </style></head><body>
    <div class="sch-name">${esc(s.shopName || 'Workshop')}</div>
    <div class="sub">Day register — ${esc(dateStr)} · printed ${today()}</div>
    <table><thead><tr><th>Rcpt#</th><th>Time</th><th>Customer</th><th>Plate</th><th>For</th><th>Mode</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7">No receipts</td></tr>'}${exrows}
    <tr class="tot"><td colspan="6">Net (${modes})</td><td class="r">${num(dt.net).toLocaleString()}</td></tr>
    </tbody></table>
    <div class="foot">Workshopy</div>
  </body></html>`;
}

export function stockReportHtml(store) {
  const s = store.settings;
  const rows = (store.parts || []).map(p => {
    const stock = (store.stockMoves || []).filter(m => m.part_id === p.id).reduce((t, m) => t + num(m.qty), 0);
    return `<tr><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(p.category || '')}</td><td class="r">${stock}</td><td>${esc(p.unit || 'pc')}</td><td class="r">${num(p.cost).toLocaleString()}</td><td class="r">${num(p.price).toLocaleString()}</td><td class="r">${num(stock * p.cost).toLocaleString()}</td></tr>`;
  }).join('');
  return `<!doctype html><html><head><style>
    @page{size:A4;margin:12mm}
    body{font:9.5pt 'Segoe UI',sans-serif}
    table{width:100%;border-collapse:collapse} td,th{border:1px solid #cbd5e1;padding:1.4mm 2mm;font-size:9pt;text-align:left}
    th{background:#0c1c33;color:#fff}.r{text-align:right}
    .foot{margin-top:4mm;font-size:8pt;color:#666;text-align:center}
  </style></head><body>
    <h1 style="font-size:13pt">${esc(s.shopName || 'Workshop')} — Parts stock</h1>
    <table><thead><tr><th>Code</th><th>Part</th><th>Category</th><th class="r">Stock</th><th>Unit</th><th class="r">Cost</th><th class="r">Price</th><th class="r">Value</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="foot">printed ${today()} · Workshopy</div>
  </body></html>`;
}
