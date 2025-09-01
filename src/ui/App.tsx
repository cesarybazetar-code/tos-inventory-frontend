import Login from "./Login";

// ...

export default function App(){
  const token = localStorage.getItem("token");

  if(!token){
    return (
      <div style={{fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial",margin:"16px"}}>
        <h1>TOS Inventory</h1>
        <Login onLogin={()=>window.location.reload()} />
        <style>{baseCss}</style>
      </div>
    );
  }

  // ... tu resto de la App
}
import React, { useState, useEffect } from 'react'
import InvoiceOCR from "./InvoiceOCR";

/* ========= ENV + STORAGE ========= */
const API_DEFAULT =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  localStorage.getItem('VITE_API_BASE_URL') ||
  '';

const ADMIN_KEY_DEFAULT =
  (import.meta as any).env?.VITE_ADMIN_KEY ||
  localStorage.getItem('admin_key') ||
  '';

type Item = { id:number; name:string; storage_area?:string; par?:number; inv_unit_price?:number; active?:boolean }
type CountLine = { item_id:number; qty:number }

/* ========= AUTH HELPERS ========= */
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
async function apiGet(path:string){ 
  const base = getApiBase();
  const r = await fetch(base + path, { headers: { ...authHeaders() } }); 
  if(!r.ok){ throw new Error(await r.text()); }
  return r.json(); 
}
async function apiPost(path:string, body:any){
  const base = getApiBase();
  const r = await fetch(base + path, { 
    method:'POST', 
    headers:{ 
      'Content-Type':'application/json', 
      'x-admin-key': getAdminKey(),
      ...authHeaders()
    }, 
    body: JSON.stringify(body) 
  });
  if(!r.ok){ throw new Error(await r.text()); }
  return r.json();
}
async function apiPut(path:string, body:any){
  const base = getApiBase();
  const r = await fetch(base + path, { 
    method:'PUT', 
    headers:{ 
      'Content-Type':'application/json', 
      'x-admin-key': getAdminKey(),
      ...authHeaders()
    }, 
    body: JSON.stringify(body) 
  });
  if(!r.ok){ throw new Error(await r.text()); }
  return r.json();
}

/* ========= ROLE PERMISSIONS (UI) ========= */
const rolePermissions: Record<string, Array<'counts'|'items'|'auto'|'settings'|'ocr'|'users'>> = {
  admin:   ['counts','items','auto','settings','ocr','users'],
  manager: ['counts','items','auto','ocr'],
  counter: ['counts'],
};

/* ========= LOGIN ========= */
function LoginPanel(){
  const [email, setEmail] = useState(localStorage.getItem('last_email') || '');
  const [password, setPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  const login = async ()=>{
    setLoading(true); setError('');
    try{
      const base = getApiBase();
      const form = new URLSearchParams();
      form.set('username', email.trim().toLowerCase());
      form.set('password', password);
      const r = await fetch(base + '/auth/login', {
        method:'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      if(!r.ok){
        throw new Error(await r.text() || 'Login failed');
      }
      const data = await r.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('last_email', email.trim().toLowerCase());
      window.location.reload();
    }catch(e:any){
      setError(e.message || 'Login failed');
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{maxWidth:480, margin:'40px auto'}}>
      <h3>Log in</h3>
      <div className="row">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      {error && <div style={{color:'red'}}>{error}</div>}
      <div className="row">
        <button className="btn" onClick={login} disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
      </div>
      <div className="muted">API: {getApiBase() || '(set in env)'}</div>
    </div>
  );
}

/* ========= SETTINGS (admin) ========= */
function Settings(){
  const [api, setApi] = useState(localStorage.getItem('VITE_API_BASE_URL') || API_DEFAULT);
  const [key, setKey] = useState(localStorage.getItem('admin_key') || ADMIN_KEY_DEFAULT);
  const save = ()=>{
    if(api) localStorage.setItem('VITE_API_BASE_URL', api); else localStorage.removeItem('VITE_API_BASE_URL');
    if(key) localStorage.setItem('admin_key', key); else localStorage.removeItem('admin_key');
    alert('Saved. Reload the page.');
  }
  return (<div className="card"><h3>Settings</h3>
    <div className="row">
      <input placeholder="API URL" value={api} onChange={e=>setApi(e.target.value)} />
      <input placeholder="Admin Key (optional)" value={key} onChange={e=>setKey(e.target.value)} />
      <button className="btn screen-only" onClick={save}>Save</button>
    </div>
    <div className="muted">Env values (Vercel) son la base; aquí puedes sobreescribir si necesitas probar algo.</div>
  </div>)
}

/* ========= IMPORTER (admin/manager) ========= */
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
    const data = await r.json();
    if(!r.ok){ alert(JSON.stringify(data)); return; }
    setMsg(`Imported ${data.created ?? 0} new, ${data.updated ?? 0} updated`);
  }
  return (<div className="card screen-only"><h3>Import Catalog CSV</h3>
    <input type="file" accept=".csv" onChange={e=> e.target.files && upload(e.target.files[0]) } />
    <div className="muted">{msg}</div></div>)
}

/* ========= ITEMS (admin/manager) ========= */
function Items(){
  const [items,setItems]=useState<Item[]>([]); 
  const [name,setName]=useState(''); 
  const [area,setArea]=useState('Cooking Line'); 
  const [par,setPar]=useState(0);
  const load = async()=> setItems(await apiGet('/items')); 
  useEffect(()=>{load();},[]);
  const add = async()=>{ 
    if(!name.trim()) return; 
    await apiPost('/items', { name, storage_area:area, par }); 
    setName(''); setPar(0); load(); 
  }
  return (<div className="card"><h3>Items (Add / Add Location)</h3>
    <div className="row screen-only">
      <input placeholder="Item name" value={name} onChange={e=>setName(e.target.value)} />
      <input placeholder="PAR" type="number" value={par} onChange={e=>setPar(parseFloat(e.target.value||'0'))} />
      <select value={area} onChange={e=>setArea(e.target.value)}>
        {['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'].map(a=><option key={a}>{a}</option>)}
      </select>
      <button className="btn" onClick={add}>Add / Add Location</button>
    </div>
    {items.map(i=>(<div key={i.id} className="card small"><b>{i.name}</b> — <span className="muted">{i.storage_area||'-'}</span> | PAR: {i.par||0}</div>))}
  </div>)
}

/* ========= COUNTS (todos) ========= */
function Counts(){
  const [items,setItems]=useState<Item[]>([]); 
  const [area,setArea]=useState('Cooking Line'); 
  const [lines,setLines]=useState<Record<number,number>>({}); 
  const [newName,setNewName]=useState(''); 
  const [newPar,setNewPar]=useState(0);

  const load = async()=>{ setItems(await apiGet('/items?area='+encodeURIComponent(area))); }; 
  useEffect(()=>{load();},[area]);

  const save = async()=>{
    const payload = { storage_area: area, lines: Object.entries(lines).filter(([_,q])=>(parseFloat(q as any)||0)>0).map(([id,qty])=>({item_id:parseInt(id), qty:Number(qty)})) };
    await apiPost('/counts', payload); setLines({}); load();
  }

  const quickAdd = async()=>{
    if(!newName.trim()) return;
    await apiPost('/items', { name: newName.trim(), storage_area: area, par: newPar || 0 });
    setNewName(''); setNewPar(0); load();
  }

  const role = localStorage.getItem('role') || 'counter';
  const canQuickAdd = role === 'admin' || role === 'manager';

  return (<div className="card">
    <div className="header screen-only" style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <h3 style={{margin:0}}>Counts — {area}</h3>
        <select value={area} onChange={e=>setArea(e.target.value)}>
          {['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'].map(a=><option key={a}>{a}</option>)}
        </select>
        <button className="btn" onClick={save}>Save Count</button>
      </div>
      <button className="btn" onClick={()=>window.print()}>🖨️ Print</button>
    </div>

    {canQuickAdd && (
      <div className="row screen-only">
        <input placeholder="Add new item here" value={newName} onChange={e=>setNewName(e.target.value)} />
        <input placeholder="PAR (optional)" type="number" value={newPar} onChange={e=>setNewPar(parseFloat(e.target.value||'0'))} />
        <div></div><button className="btn" onClick={quickAdd}>Add Item Here</button>
      </div>
    )}

    <table className="print-table">
      <thead>
        <tr>
          <th style={{width:'55%'}}>Item</th>
          <th style={{width:'15%'}}>PAR</th>
          <th style={{width:'30%'}}>Count</th>
        </tr>
      </thead>
      <tbody>
        {items.map(i=>(
          <tr key={i.id}>
            <td>{i.name}</td>
            <td>{i.par ?? 0}</td>
            <td className="screen-only">
              <input
                type="number"
                value={lines[i.id] || ''}
                onChange={e=>setLines(prev=>({...prev,[i.id]:parseFloat(e.target.value||'0')}))}
              />
            </td>
            <td className="paper-only">&nbsp;</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="muted">{items.length} item(s) in this area</div>
  </div>)
}

/* ========= AUTO PO (admin/manager) ========= */
function AutoPO(){
  const [area,setArea]=useState('Cooking Line'); const [rows,setRows]=useState<any[]>([]);
  const run = async()=>{ const data = await apiGet(`/auto-po?storage_area=${encodeURIComponent(area)}`); setRows(data.lines||[]); }
  useEffect(()=>{run();},[area]);
  return (<div className="card"><h3>Auto-PO</h3>
    <div className="row screen-only"><select value={area} onChange={e=>setArea(e.target.value)}>
      {['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'].map(a=><option key={a}>{a}</option>)}
    </select><button className="btn" onClick={run}>Refresh</button></div>
    <table><thead><tr><th>Item</th><th>Area</th><th>On Hand</th><th>PAR</th><th>Suggested</th></tr></thead>
      <tbody>{rows.map((r,i)=>(<tr key={i}><td>{r.name}</td><td>{r.storage_area||'-'}</td><td>{r.on_hand}</td><td>{r.par}</td><td>{r.suggested_order_qty}</td></tr>))}</tbody>
    </table></div>)
}

/* ========= USERS (admin) ========= */
type UserRow = { id:number; email:string; name?:string; role:'admin'|'manager'|'counter'|'viewer'; active:boolean }

function UsersAdmin(){
  const [users,setUsers]=useState<UserRow[]>([]);
  const [email,setEmail]=useState('');
  const [name,setName]=useState('');
  const [password,setPassword]=useState('');
  const [role,setRole]=useState<'admin'|'manager'|'counter'|'viewer'>('counter');
  const [error,setError]=useState('');

  const load = async()=>{
    try{
      const res = await apiGet('/admin/users'); // <-- main.py: admin router
      setUsers(res);
    }catch(e:any){ setError(e.message||'Error loading users'); }
  };
  useEffect(()=>{load();},[]);

  const createUser = async()=>{
    setError('');
    try{
      await apiPost('/auth/register', { email: email.trim().toLowerCase(), password, name, role });
      setEmail(''); setPassword(''); setName(''); setRole('counter');
      await load();
      alert('User created');
    }catch(e:any){ setError(e.message||'Error creating user'); }
  };

  const updateUser = async (u:UserRow, patch:Partial<UserRow> & {new_password?:string})=>{
    setError('');
    try{
      const body:any = {};
      if(patch.name !== undefined) body.name = patch.name;
      if(patch.role !== undefined) body.role = patch.role;
      if(patch.active !== undefined) body.active = patch.active;
      if(patch.new_password) body.new_password = patch.new_password; // <-- main.py expects new_password
      await apiPut(`/admin/users/${u.id}`, body); // <-- path actualizado
      await load();
    }catch(e:any){ setError(e.message||'Error updating user'); }
  };

  return (
    <div className="card">
      <h3>Users</h3>
      {error && <div style={{color:'red'}}>{error}</div>}

      <div className="row">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Name"  value={name}  onChange={e=>setName(e.target.value)} />
      </div>
      <div className="row">
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <select value={role} onChange={e=>setRole(e.target.value as any)}>
          <option value="counter">counter</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
          <option value="viewer">viewer</option>
        </select>
      </div>
      <div className="row">
        <button className="btn" onClick={createUser}>Create user</button>
      </div>

      <table style={{width:'100%', borderCollapse:'collapse', marginTop:10}}>
        <thead>
          <tr>
            <th>Email</th><th>Name</th><th>Role</th><th>Active</th><th>Reset PW</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u=>(
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <input value={u.name||''} onChange={e=>updateUser(u,{name:e.target.value})}/>
              </td>
              <td>
                <select value={u.role} onChange={e=>updateUser(u,{role:e.target.value as any})}>
                  <option value="counter">counter</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                  <option value="viewer">viewer</option>
                </select>
              </td>
              <td>
                <input type="checkbox" checked={u.active} onChange={e=>updateUser(u,{active:e.target.checked})}/>
              </td>
              <td>
                <button className="btn" onClick={()=>{
                  const pw = prompt('New password for '+u.email);
                  if(pw){ updateUser(u,{new_password:pw}); }
                }}>Set</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ========= TOP BAR ========= */
function TopBar({tab,setTab,allowedTabs}:{tab:string,setTab:(t:any)=>void,allowedTabs:Array<string>}){
  const email = localStorage.getItem('email') || '';
  const role  = localStorage.getItem('role') || 'counter';
  const logout = ()=>{
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.reload();
  };

  const TabBtn = ({id,label}:{id:any,label:string}) => (
    allowedTabs.includes(id) ? (
      <button className={'tab '+(tab===id?'active':'')} onClick={()=>setTab(id)}>{label}</button>
    ) : null
  );

  return (
    <div className="screen-only" style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',gap:8}}>
        <TabBtn id="counts" label="Counts" />
        <TabBtn id="items"  label="Items" />
        <TabBtn id="auto"   label="Auto-PO" />
        <TabBtn id="ocr"    label="Scan Invoice" />
        <TabBtn id="users"  label="Users" />
        <TabBtn id="settings" label="Settings" />
      </div>
      <div className="muted" style={{display:'flex',gap:8,alignItems:'center'}}>
        <span>{email} ({role})</span>
        <button className="btn" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

/* ========= APP ROOT ========= */
export default function App(){
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role') || 'counter';
  const allowedTabs = rolePermissions[role] || ['counts'];

  const [tab,setTab]=useState<'counts'|'items'|'auto'|'settings'|'ocr'|'users'>(
    (allowedTabs.includes('counts') ? 'counts' :
     allowedTabs.includes('items') ? 'items' :
     allowedTabs.includes('auto') ? 'auto' :
     allowedTabs.includes('ocr') ? 'ocr' :
     allowedTabs.includes('users') ? 'users' : 'settings') as any
  );

  if(!token){
    return (
      <div style={{fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Arial',margin:'16px'}}>
        <h1>TOS Inventory</h1>
        <LoginPanel/>
        <style>{baseCss}</style>
      </div>
    );
  }

  return (
    <div style={{fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Arial',margin:'16px'}}>
      <h1>TOS Inventory</h1>
      <TopBar tab={tab} setTab={setTab} allowedTabs={allowedTabs}/>
      {(role==='admin' || role==='manager') && <Importer/>}
      {tab==='counts'   && <Counts/>}
      {tab==='items'    && (role==='admin' || role==='manager') && <Items/>}
      {tab==='auto'     && (role==='admin' || role==='manager') && <AutoPO/>}
      {tab==='ocr'      && (role==='admin' || role==='manager') && <InvoiceOCR/>}
      {tab==='users'    && (role==='admin') && <UsersAdmin/>}
      {tab==='settings' && (role==='admin') && <Settings/>}
      <style>{baseCss}</style>
    </div>
  )
}

/* ========= CSS ========= */
const baseCss = `
  .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
  .tab{padding:8px 12px;border:1px solid #000;border-radius:10px;background:#fff}
  .tab.active{background:#000;color:#fff}
  .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0}
  input,select{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{padding:8px;border-top:1px solid #eee;text-align:left}
  .muted{color:#6b7280}
  .paper-only{display:none}

  @media print{
    body{margin:0}
    .screen-only{display:none !important}
    .card{border:none;padding:0;margin:0}
    .tab, .btn{display:none !important}
    .print-table{width:100%;border-collapse:collapse}
    .print-table th, .print-table td{border:1px solid #000;padding:6px}
    .paper-only{display:table-cell}
  }
`;