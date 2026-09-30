import React, { useEffect, useRef, useState } from 'react';
import { emptyStore, sampleStore } from './lib/model.js';
import Dashboard from './components/Dashboard.jsx';
import JobCardsPanel from './components/JobCardsPanel.jsx';
import VehiclesPanel from './components/VehiclesPanel.jsx';
import PartsPanel from './components/PartsPanel.jsx';
import MechanicsPanel from './components/MechanicsPanel.jsx';
import CollectionPanel from './components/CollectionPanel.jsx';
import ReportsPanel from './components/ReportsPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import PinGate from './components/PinGate.jsx';
import { installWebApi } from './lib/webapi.js';
import { customersCsv } from './lib/csv.js';

installWebApi();

const NAV = [
  { sec: 'Workshop', secUr: 'ورکشاپ', items: [
    { id: 'dash', label: 'Dashboard', ur: 'ڈیش بورڈ', glyph: '⌂' },
    { id: 'jobs', label: 'Job cards', ur: 'جاب کارڈ', glyph: '▣' },
    { id: 'vehicles', label: 'Customers & vehicles', ur: 'گاڑیاں', glyph: '◉' },
    { id: 'mechanics', label: 'Mechanics', ur: 'میکینک', glyph: '⚒' },
  ]},
  { sec: 'Stock & money', secUr: 'مال و رقم', items: [
    { id: 'parts', label: 'Parts & stock', ur: 'پارٹس', glyph: '▤' },
    { id: 'collection', label: 'Collection & day book', ur: 'وصولی', glyph: '◍' },
    { id: 'reports', label: 'Reports', ur: 'رپورٹس', glyph: '▥' },
    { id: 'settings', label: 'Settings', ur: 'ترتیبات', glyph: '⚙' },
  ]}
];
const ROLE_TABS = {
  owner: null,
  manager: ['dash', 'jobs', 'vehicles', 'mechanics', 'parts', 'collection', 'reports'],
  mechanic: ['dash', 'jobs', 'vehicles', 'parts'],
  clerk: ['dash', 'vehicles', 'jobs']
};

export default function App() {
  const [store, setStore] = useState(null);
  const [user, setUser] = useState(null);
  const idleRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    const reset = () => { clearTimeout(idleRef.current); idleRef.current = setTimeout(() => setUser(null), 10 * 60 * 1000); };
    ['mousemove', 'keydown', 'click'].forEach(e => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(idleRef.current); ['mousemove', 'keydown', 'click'].forEach(e => window.removeEventListener(e, reset)); };
  }, [user]);
  const [tab, setTab] = useState('dash');
  const [version, setVersion] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const { doc } = await window.api.store.load();
      const hasData = doc && (doc.jobCards?.length || doc.vehicles?.length || doc.settings?.firstRunDone);
      if (hasData) {
        const base = emptyStore();
        Object.keys(base).forEach(k => { if (doc[k] === undefined) doc[k] = base[k]; });
        doc.settings = { ...emptyStore().settings, ...(doc.settings || {}) };
        setStore(doc);
      } else setStore(sampleStore());
      setVersion(await window.api.app.version().catch(() => ''));
    })();
  }, []);

  useEffect(() => {
    if (!store) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.api.store.save(store);
      if (store.settings.syncFolder) {
        const text = JSON.stringify(store);
        window.api.export.toFolder({ folder: store.settings.syncFolder, name: 'workshopy-sync.json', text });
        syncText.current = text;
      }
      if (store.settings.syncAuto !== false) window.api.sync.publish(store);
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [store]);

  useEffect(() => {
    if (!window.api.sync?.onApply) return;
    window.api.sync.onApply(doc => {
      const base = emptyStore();
      Object.keys(base).forEach(k => { if (doc[k] === undefined) doc[k] = base[k]; });
      doc.settings = { ...base.settings, ...(doc.settings || {}) };
      setStore(doc);
      setSyncFlash(Date.now());
    });
  }, []);

  const syncText = useRef('');
  const [syncFlash, setSyncFlash] = useState(0);
  useEffect(() => {
    const t = setInterval(async () => {
      const folder = store?.settings?.syncFolder;
      if (!folder || store?.settings?.syncAuto === false) return;
      const res = await window.api.export.readFromFolder({ folder, name: 'workshopy-sync.json' }).catch(() => null);
      if (!res?.ok || !res.text) return;
      if (res.text === syncText.current || res.text === JSON.stringify(store)) return;
      try {
        const doc = JSON.parse(res.text);
        if (!doc || !Array.isArray(doc.jobCards)) return;
        const base = emptyStore();
        Object.keys(base).forEach(k => { if (doc[k] === undefined) doc[k] = base[k]; });
        doc.settings = { ...base.settings, ...(doc.settings || {}) };
        syncText.current = res.text;
        setStore(doc);
        setSyncFlash(Date.now());
      } catch { /* partial write */ }
    }, 5000);
    return () => clearInterval(t);
  }, [store]);

  const update = (fn, label) => setStore(s => {
    const next = structuredClone(s);
    fn(next);
    next.auditLog = next.auditLog || [];
    next.updatedAt = Date.now();
    next.auditLog.push({ at: new Date().toISOString(), user: (user && user.name) || 'app', what: label || 'edit' });
    if (next.auditLog.length > 500) next.auditLog = next.auditLog.slice(-500);
    return next;
  });

  const exportAllJson = () => {
    const json = JSON.stringify(store, null, 2);
    window.api.export.json({ json, suggestedName: 'workshopy-backup.json' });
    if (store.settings.backupFolder)
      window.api.export.toFolder({ folder: store.settings.backupFolder, name: `workshopy-backup-${new Date().toISOString().slice(0, 10)}.json`, text: json });
    update(s => s.settings.lastBackupAt = new Date().toISOString().slice(0, 10));
  };
  const exportCustomersCsv = () => window.api.export.text({ text: customersCsv(store), suggestedName: 'workshopy-customers.csv' });
  const importJson = async () => {
    const f = await window.api.app.openFile({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!f?.text) return;
    try {
      const parsed = JSON.parse(f.text);
      if (!parsed.jobCards) throw new Error('not a Workshopy backup');
      await window.api.store.snapshot(store, 'before import');
      setStore({ ...emptyStore(), ...parsed });
    } catch (e) { alert('Could not import: ' + e.message); }
  };

  if (!store) return <div className="boot">Loading…</div>;

  if ((store.settings.users || []).length && !user)
    return <PinGate store={store} onLogin={setUser} />;

  const firstRun = !store.settings.firstRunDone;
  const ur = !!store.settings.uiUrdu;
  const allowed = user && ROLE_TABS[user.role] ? ROLE_TABS[user.role] : null;
  const nav = allowed
    ? NAV.map(g => ({ ...g, items: g.items.filter(i => allowed.includes(i.id)) })).filter(g => g.items.length)
    : NAV;
  if (allowed && !allowed.includes(tab)) setTab('dash');
  return (
    <div className="app" dir={ur ? 'rtl' : 'ltr'}>
      <aside className="side">
        <div className="sbrand"><span className="smark">⚒</span><div><div className="sname">Workshopy</div><div className="ssub">Auto workshop office</div></div></div>
        {nav.map(g => (
          <div key={g.sec} className="sgrp">
            <div className="ssec">{ur ? (g.secUr || g.sec) : g.sec}</div>
            {g.items.map(t => (
              <button key={t.id} className={'snav' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
                <span className="sglyph">{t.glyph}</span>{ur ? (t.ur || t.label) : t.label}
              </button>
            ))}
          </div>
        ))}
        <div className="sfoot">
          <div className="sdotline"><span className="sdot" />Offline</div>
          <span>Data stays on this computer</span>
        </div>
      </aside>

      <div className="main">
        <header className="status">
          <div className="stline">
            <b>{store.settings.shopName || 'Workshop'}</b>
            <span className="opd">Workshop open</span>
            {store.settings.syncAuto !== false && (
              <span className="opd" title="Auto-sync on — updates move between Workshopy apps on this WiFi/LAN automatically"
                style={Date.now() - syncFlash < 8000 ? { background: '#bbf7d0', color: '#166534' } : { background: '#e0f2fe', color: '#0369a1' }}>
                ↻ Live sync
              </span>)}
            {user && <span className="muted">👤 {user.name} ({user.role}) <button className="icon" title="Lock" onClick={() => setUser(null)}>🔒</button></span>}
          </div>
          <span className="spacer" />
          <div className="top-actions">
            <button className="btn ghost" onClick={exportAllJson} title="Backup everything as JSON">Backup</button>
            <button className="btn ghost" onClick={exportCustomersCsv}>Customers CSV</button>
            <button className="btn ghost" onClick={importJson}>Import</button>
            <button className="btn" onClick={() => setTab('jobs')}>+ New job card</button>
          </div>
        </header>

        {firstRun && (
          <div className="welcome">
            <h1>Welcome to Workshopy</h1>
            <p>A sample workshop (Al-Falah Auto Workshop) with customers, vehicles, parts stock and live job cards is loaded so you can try everything — open a job card, add parts &amp; labor, print an invoice and a gate pass.</p>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, maxWidth: 560 }}>
              <b>Your consent &amp; privacy:</b> Workshopy stores customer and vehicle records —
              names, phone numbers and service history. By using it you agree that this data is entered and
              stored <b>only on this computer</b>, encrypted at rest, and that <b>your workshop is the data
              controller</b> — you are responsible for consent, backups and lawful handling. The app makes
              no internet connection; LAN sharing stays off unless you turn it on.
            </p>
            <div className="welcome-actions">
              <button className="btn" onClick={() => update(s => { s.settings.firstRunDone = true; s.settings.consent = { at: new Date().toISOString(), version }; })}>I accept — explore sample data</button>
              <button className="btn ghost" onClick={() => { setStore({ ...emptyStore(), settings: { ...emptyStore().settings, firstRunDone: true, consent: { at: new Date().toISOString(), version } } }); setTab('settings'); }}>I accept — start blank, set up my workshop</button>
            </div>
          </div>
        )}

        <main className="body">
          {tab === 'dash' && <Dashboard store={store} update={update} go={setTab} />}
          {tab === 'jobs' && <JobCardsPanel store={store} update={update} />}
          {tab === 'vehicles' && <VehiclesPanel store={store} update={update} />}
          {tab === 'parts' && <PartsPanel store={store} update={update} />}
          {tab === 'mechanics' && <MechanicsPanel store={store} update={update} />}
          {tab === 'collection' && <CollectionPanel store={store} update={update} user={user} />}
          {tab === 'reports' && <ReportsPanel store={store} />}
          {tab === 'settings' && <SettingsPanel store={store} update={update} setStore={setStore} />}
        </main>
        <footer className="foot">Workshopy v{version} — offline auto workshop office. Data is encrypted on this computer.</footer>
      </div>
    </div>
  );
}
