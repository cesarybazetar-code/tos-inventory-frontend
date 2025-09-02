import React, { useState } from 'react'

/** Lightweight helpers (scoped here so this file is self-contained) */
const API_DEFAULT =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  localStorage.getItem('VITE_API_BASE_URL') ||
  '';

const ADMIN_KEY_DEFAULT =
  (import.meta as any).env?.VITE_ADMIN_KEY ||
  localStorage.getItem('admin_key') ||
  '';

function authHeaders(){
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function getApiBase() {
  return localStorage.getItem('VITE_API_BASE_URL') || API_DEFAULT;
}
function getAdminKey() {
  return localStorage.getItem('admin_key') || ADMIN_KEY_DEFAULT;
}

/** CSV Importer (admin/manager) */
function Importer(){
  const [msg,setMsg]=useState('');
  const upload = async (file:File)=>{
    const base = getApiBase();
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch(base + '/import/catalog', {
      method:'POST',
      headers:{ 'x-admin-key': getAdminKey(), ...authHeaders() },
      body: fd
    });
    let data: any = {};
    try { data = await r.json(); } catch {}
    if(!r.ok){
      alert(typeof data === 'object' ? JSON.stringify(data) : 'Import failed');
      return;
    }
    setMsg(`Imported ${data.created ?? 0} new, ${data.updated ?? 0} updated`);
  };
  return (
    <div className="card screen-only">
      <h3>Import Catalog CSV</h3>
      <input type="file" accept=".csv" onChange={e=> e.target.files && upload(e.target.files[0]) } />
      <div className="muted">{msg}</div>
    </div>
  );
}

/** Reset Panel — supports multiple reset modes */
function ResetPanel(){
  const [selection, setSelection] = useState<string[]>([]);

  const toggle = (id:string) =>
    setSelection(sel => sel.includes(id) ? sel.filter(s=>s!==id) : [...sel,id]);

  const reset = async ()=>{
    if(selection.length === 0){
      alert('Select at least one target (Items / Counts / Users)');
      return;
    }
    if(!window.confirm('⚠️ This will permanently delete the selected data. Continue?')) return;

    const base = getApiBase();
    const r = await fetch(base + '/admin/reset', {
      method: 'DELETE',
      headers: {
        'Content-Type':'application/json',
        'x-admin-key': getAdminKey(),
        ...authHeaders()
      },
      body: JSON.stringify({ targets: selection })
    });
    const data = await r.json().catch(()=>({}));
    if(!r.ok){
      alert((data && data.detail) || 'Reset failed');
      return;
    }
    alert(data.message || 'Reset complete');
    window.location.reload();
  };

  return (
    <div className="card screen-only">
      <h3>Reset Options</h3>

      <div className="row">
        <label><input type="checkbox" checked={selection.includes('items')} onChange={()=>toggle('items')} /> Items</label>
        <label><input type="checkbox" checked={selection.includes('counts')} onChange={()=>toggle('counts')} /> Counts</label>
        <label><input type="checkbox" checked={selection.includes('users')} onChange={()=>toggle('users')} /> Users</label>
      </div>

      <button className="btn" onClick={reset}>Reset Selected</button>

      <div className="muted" style={{marginTop:8}}>
        <b>Catalog Reset:</b> select <i>Items</i> + <i>Counts</i>.<br/>
        <b>Factory Reset:</b> select <i>Items</i> + <i>Counts</i> + <i>Users</i>.<br/>
        <b>Selective:</b> choose only what you need.
      </div>
    </div>
  );
}

export default function SettingsPanel(){
  return (
    <>
      <Importer />
      <ResetPanel />
    </>
  );
}
