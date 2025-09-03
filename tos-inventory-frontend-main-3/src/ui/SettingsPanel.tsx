import React, { useState } from 'react';

/** ------- small helpers (local to this file) ------- */
const API_DEFAULT =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  localStorage.getItem('VITE_API_BASE_URL') ||
  '';

const ADMIN_KEY_DEFAULT =
  (import.meta as any).env?.VITE_ADMIN_KEY ||
  localStorage.getItem('admin_key') ||
  '';

function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function getApiBase() {
  return localStorage.getItem('VITE_API_BASE_URL') || API_DEFAULT;
}
function getAdminKey() {
  return localStorage.getItem('admin_key') || ADMIN_KEY_DEFAULT;
}

/** ------- Basic Settings (API URL + Admin Key) ------- */
function BasicSettings() {
  const [api, setApi] = useState(localStorage.getItem('VITE_API_BASE_URL') || API_DEFAULT);
  const [key, setKey] = useState(localStorage.getItem('admin_key') || ADMIN_KEY_DEFAULT);

  const save = () => {
    if (api) localStorage.setItem('VITE_API_BASE_URL', api);
    else localStorage.removeItem('VITE_API_BASE_URL');

    if (key) localStorage.setItem('admin_key', key);
    else localStorage.removeItem('admin_key');

    alert('Saved. Reloading…');
    window.location.reload();
  };

  return (
    <div className="card">
      <h3>Settings</h3>
      <div className="row">
        <input
          placeholder="API URL (e.g. https://tos-inventory-backend.onrender.com)"
          value={api}
          onChange={(e) => setApi(e.target.value)}
        />
        <input
          placeholder="Admin Key (optional)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button className="btn screen-only" onClick={save}>Save</button>
      </div>
      <div className="muted">You can pin the API here if it isn’t provided by env vars.</div>
    </div>
  );
}

/** ------- CSV Importer ------- */
function Importer() {
  const [status, setStatus] = useState('');
  const [importType, setImportType] = useState<'catalog' | 'sales' | 'labor' | 'pmix'>('catalog');

  const upload = async (file: File) => {
    const base = getApiBase();
    const fd = new FormData();
    fd.append('file', file);

    try {
      const r = await fetch(base + `/import/${importType}`, {
        method: 'POST',
        headers: { 'x-admin-key': getAdminKey(), ...authHeaders() },
        body: fd,
      });

      const txt = await r.text();
      let data: any = txt;
      try { data = JSON.parse(txt); } catch {}

      if (!r.ok) {
        const msg =
          (typeof data === 'string' && data) ||
          data?.detail ||
          data?.error ||
          JSON.stringify(data);
        alert(`Import failed: ${msg}`);
        return;
      }

      setStatus(
        typeof data === 'string'
          ? data
          : `Imported ${data.created ?? 0} new, ${data.updated ?? 0} updated`
      );
    } catch (e: any) {
      alert(`Import error: ${e?.message || 'network error'}`);
    }
  };

  return (
    <div className="card screen-only">
      <h3>Import CSV (Catalog / Sales / Labor / PMix)</h3>
      <div className="row">
        <label>Import Type
          <select
            value={importType}
            onChange={(e) => setImportType(e.target.value as 'catalog' | 'sales' | 'labor' | 'pmix')}
          >
            <option value="catalog">Catalog</option>
            <option value="sales">Sales (Toast CSV)</option>
            <option value="labor">Labor (Toast CSV)</option>
            <option value="pmix">PMix (Toast CSV)</option>
          </select>
        </label>
      </div>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => e.target.files && upload(e.target.files[0])}
      />
      <div className="muted">{status}</div>
    </div>
  );
}

/** ------- Reset Panel ------- */
function ResetPanel() {
  const [selection, setSelection] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelection((sel) =>
      sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]
    );

  const reset = async () => {
    if (selection.length === 0) {
      alert('Select at least one target (Items / Counts / Users)');
      return;
    }
    if (!window.confirm('⚠️ This will permanently delete the selected data. Continue?')) return;

    try {
      const base = getApiBase();
      const r = await fetch(base + '/admin/reset', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey(),
          ...authHeaders(),
        },
        body: JSON.stringify({ targets: selection }),
      });

      const txt = await r.text();
      let data: any = txt;
      try { data = JSON.parse(txt); } catch {}

      if (!r.ok) {
        const msg =
          (typeof data === 'string' && data) ||
          data?.detail ||
          data?.error ||
          JSON.stringify(data);
        alert(`Reset failed: ${msg}`);
        return;
      }

      const msg =
        (typeof data === 'string' && data) ||
        data?.message ||
        'Reset complete';
      alert(msg);
      window.location.reload();
    } catch (e: any) {
      alert(`Reset error: ${e?.message || 'network error'}`);
    }
  };

  return (
    <div className="card screen-only">
      <h3>Reset Options</h3>
      <div className="row">
        <label>
          <input
            type="checkbox"
            checked={selection.includes('items')}
            onChange={() => toggle('items')}
          /> Items
        </label>
        <label>
          <input
            type="checkbox"
            checked={selection.includes('counts')}
            onChange={() => toggle('counts')}
          /> Counts
        </label>
        <label>
          <input
            type="checkbox"
            checked={selection.includes('users')}
            onChange={() => toggle('users')}
          /> Users
        </label>
      </div>
      <button className="btn" onClick={reset}>Reset Selected</button>
      <div className="muted" style={{ marginTop: 8 }}>
        <b>Catalog Reset:</b> select <i>Items</i> + <i>Counts</i>.<br/>
        <b>Factory Reset:</b> select <i>Items</i> + <i>Counts</i> + <i>Users</i>.<br/>
        <b>Selective:</b> choose only what you need.
      </div>
    </div>
  );
}

/** ------- Settings Panel (exported) ------- */
export default function SettingsPanel() {
  return (
    <>
      <BasicSettings />
      <Importer />
      <ResetPanel />
    </>
  );
}