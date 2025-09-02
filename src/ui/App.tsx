import React, { useState, useEffect } from 'react';
import InvoiceOCR from './InvoiceOCR';
import Login from './Login';
import SettingsPanel from './SettingsPanel';

// ====== ENV + STORAGE DEFAULTS ======
const API_DEFAULT =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  localStorage.getItem('VITE_API_BASE_URL') ||
  '';

const ADMIN_KEY_DEFAULT =
  (import.meta as any).env?.VITE_ADMIN_KEY ||
  localStorage.getItem('admin_key') ||
  '';

type Item = {
  id: number;
  name: string;
  storage_area?: string;
  par?: number;
  inv_unit_price?: number;
  active?: boolean;
};

// ====== AUTH HELPERS ======
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
async function apiGet(path: string) {
  const base = getApiBase();
  const r = await fetch(base + path, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost(path: string, body: any) {
  const base = getApiBase();
  const r = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPut(path: string, body: any) {
  const base = getApiBase();
  const r = await fetch(base + path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ====== ROLE PERMISSIONS (UI) ======
const rolePermissions: Record<
  string,
  Array<'counts' | 'catalog' | 'items' | 'auto' | 'settings' | 'ocr' | 'users'>
> = {
  admin: ['counts', 'catalog', 'items', 'auto', 'settings', 'ocr', 'users'],
  manager: ['counts', 'items', 'auto', 'ocr'],
  counter: ['counts'],
  viewer: ['counts'],
};

// ====== ITEMS (admin/manager) ======
function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [area, setArea] = useState('Cooking Line');
  const [par, setPar] = useState(0);

  const load = async () => setItems(await apiGet('/items'));
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await apiPost('/items', { name, storage_area: area, par });
    setName('');
    setPar(0);
    load();
  };

  return (
    <div className="card">
      <h3>Items (Add / Add Location)</h3>
      <div className="row screen-only">
        <input placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
        <input
          placeholder="PAR"
          type="number"
          value={par}
          onChange={e => setPar(parseFloat(e.target.value || '0'))}
        />
        <select value={area} onChange={e => setArea(e.target.value)}>
          {[
            'Cooking Line',
            'Meat',
            'Seafood',
            'Dairy',
            'Produce',
            'Dry & Other',
            'Freezer',
            'Bev & Coffee',
            'Grocery',
          ].map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn" onClick={add}>
          Add / Add Location
        </button>
      </div>
      {items.map(i => (
        <div key={i.id} className="card small">
          <b>{i.name}</b> — <span className="muted">{i.storage_area || '-'}</span> | PAR:{' '}
          {i.par || 0}
        </div>
      ))}
    </div>
  );
}

// ====== COUNTS with suggestions ======
function Counts(){
  const [items,setItems]=useState<Item[]>([]);
  const [area,setArea]=useState('Cooking Line');
  const [lines,setLines]=useState<Record<number,number>>({});
  const [newName,setNewName]=useState('');
  const [newPar,setNewPar]=useState(0);

  // suggestions
  const [suggestions,setSuggestions]=useState<Item[]>([]);
  const [showSug,setShowSug]=useState(false);
  const [loadingSug,setLoadingSug]=useState(false);
  let sugTimer: number | undefined;

  const load = async()=>{ setItems(await apiGet('/items?area='+encodeURIComponent(area))); };
  useEffect(()=>{load();},[area]);

  // tiny string similarity (Dice coefficient on bigrams)
  function sim(a:string,b:string){
    a=a.toLowerCase().trim(); b=b.toLowerCase().trim();
    if(!a||!b) return 0;
    if(a===b) return 1;
    const bigrams=(s:string)=> {
      const arr:string[]=[]; for(let i=0;i<s.length-1;i++) arr.push(s.slice(i,i+2));
      return arr;
    };
    const A=bigrams(a), B=bigrams(b);
    const setA=new Map<string,number>(); A.forEach(x=>setA.set(x,(setA.get(x)||0)+1));
    let inter=0; B.forEach(x=>{ const c=setA.get(x)||0; if(c>0){ inter+=1; setA.set(x,c-1); }});
    return (2*inter)/(A.length+B.length || 1);
  }

  // fetch suggestions as user types
  const fetchSuggestions = async (q:string)=>{
    if(q.trim().length < 2){ setSuggestions([]); return; }
    setLoadingSug(true);
    try{
      const res: Item[] = await apiGet('/items?q='+encodeURIComponent(q));
      // rank by similarity to the typed text
      const ranked = res
        .map(r => ({ r, s: sim(q, r.name) }))
        .sort((a,b)=> b.s - a.s)
        .slice(0,5)
        .map(x=>x.r);
      setSuggestions(ranked);
    }catch(_){}
    setLoadingSug(false);
  };

  const onType = (v:string)=>{
    setNewName(v);
    setShowSug(true);
    // debounce network a bit
    if(sugTimer) window.clearTimeout(sugTimer);
    sugTimer = window.setTimeout(()=>fetchSuggestions(v), 180) as any;
  };

  const applySuggestion = (it: Item)=>{
    setNewName(it.name);
    setNewPar(it.par ?? 0);
    setShowSug(false);
  };

  const save = async()=>{
    const payload = {
      storage_area: area,
      lines: Object.entries(lines)
        .filter(([_,q])=>(parseFloat(q as any)||0)>0)
        .map(([id,qty])=>({item_id:parseInt(id), qty:Number(qty)}))
    };
    await apiPost('/counts', payload); setLines({}); load();
  };

  const role = localStorage.getItem('role') || 'viewer';
  const canQuickAdd = role === 'admin' || role === 'manager';
  const canSave = role === 'admin' || role === 'manager' || role === 'counter';

  return (
    <div className="card" style={{position:'relative'}}>
      <div className="header screen-only" style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <h3 style={{margin:0}}>Counts — {area}</h3>
          <select value={area} onChange={e=>setArea(e.target.value)}>
            {['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'].map(a=><option key={a}>{a}</option>)}
          </select>
          {canSave && <button className="btn" onClick={save}>Save Count</button>}
        </div>
        <button className="btn" onClick={()=>window.print()}>🖨️ Print</button>
      </div>

      {canQuickAdd && (
        <div className="row screen-only" style={{position:'relative'}}>
          <div style={{position:'relative'}}>
            <input
              placeholder="Add new item here"
              value={newName}
              onChange={e=>onType(e.target.value)}
              onFocus={()=> setShowSug(true)}
              onBlur={()=> setTimeout(()=>setShowSug(false), 150)} // let clicks register
            />
            {/* suggestions dropdown */}
            {showSug && (suggestions.length>0 || loadingSug) && (
              <div style={{
                position:'absolute', zIndex:10, left:0, right:0, top:'100%',
                background:'#fff', border:'1px solid #cbd5e1', borderRadius:10, marginTop:4
              }}>
                {loadingSug && <div style={{padding:8}} className="muted">Searching…</div>}
                {suggestions.map(s=>(
                  <div
                    key={s.id}
                    onMouseDown={(e)=>e.preventDefault()}
                    onClick={()=>applySuggestion(s)}
                    style={{padding:'8px 10px', cursor:'pointer'}}
                  >
                    <b>{s.name}</b> <span className="muted">— {s.storage_area||'-'} | PAR: {s.par ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            placeholder="PAR (optional)"
            type="number"
            value={newPar}
            onChange={e=>setNewPar(parseFloat(e.target.value||'0'))}
          />
          <div></div>
          <button
            className="btn"
            onClick={async ()=>{
              if(!newName.trim()) return;
              // adding the (possibly suggested) item to this area
              await apiPost('/items', { name: newName.trim(), storage_area: area, par: newPar || 0 });
              setNewName(''); setNewPar(0); setSuggestions([]); load();
            }}
          >
            Add Item Here
          </button>
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
                  disabled={!canSave}
                />
              </td>
              <td className="paper-only">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="muted">{items.length} item(s) in this area</div>
    </div>
  );
}

// ====== AUTO PO (admin/manager) ======
function AutoPO() {
  const [area, setArea] = useState('Cooking Line');
  const [rows, setRows] = useState<any[]>([]);
  const run = async () => {
    const data = await apiGet(`/auto-po?storage_area=${encodeURIComponent(area)}`);
    setRows(data.lines || []);
  };
  useEffect(() => {
    run();
  }, [area]);
  return (
    <div className="card">
      <h3>Auto-PO</h3>
      <div className="row screen-only">
        <select value={area} onChange={e => setArea(e.target.value)}>
          {[
            'Cooking Line',
            'Meat',
            'Seafood',
            'Dairy',
            'Produce',
            'Dry & Other',
            'Freezer',
            'Bev & Coffee',
            'Grocery',
          ].map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn" onClick={run}>
          Refresh
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Area</th>
            <th>On Hand</th>
            <th>PAR</th>
            <th>Suggested</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{r.storage_area || '-'}</td>
              <td>{r.on_hand}</td>
              <td>{r.par}</td>
              <td>{r.suggested_order_qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ====== USERS (admin only) ======
type UserRow = {
  id: number;
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'counter' | 'viewer';
  active: boolean;
};

function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'counter' | 'viewer'>('counter');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await apiGet('/admin/users');
      setUsers(res);
    } catch (e: any) {
      setError(e.message || 'Error loading users');
    }
  };
  useEffect(() => {
    load();
  }, []);

  const createUser = async () => {
    setError('');
    try {
      await apiPost('/auth/register', { email: email.trim().toLowerCase(), password, name, role });
      setEmail('');
      setPassword('');
      setName('');
      setRole('counter');
      await load();
      alert('User created');
    } catch (e: any) {
      setError(e.message || 'Error creating user');
    }
  };

  const updateUser = async (u: UserRow, patch: Partial<UserRow> & { password?: string }) => {
    setError('');
    try {
      const body: any = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.role !== undefined) body.role = patch.role;
      if (patch.active !== undefined) body.active = patch.active;
      if ((patch as any).password) body.new_password = (patch as any).password;
      await apiPut(`/admin/users/${u.id}`, body);
      await load();
    } catch (e: any) {
      setError(e.message || 'Error updating user');
    }
  };

  return (
    <div className="card">
      <h3>Users</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div className="row">
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="row">
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <select value={role} onChange={e => setRole(e.target.value as any)}>
          <option value="counter">counter</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
          <option value="viewer">viewer</option>
        </select>
      </div>
      <div className="row">
        <button className="btn" onClick={createUser}>
          Create user
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Active</th>
            <th>Reset PW</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                <input value={u.name || ''} onChange={e => updateUser(u, { name: e.target.value })} />
              </td>
              <td>
                <select value={u.role} onChange={e => updateUser(u, { role: e.target.value as any })}>
                  <option value="counter">counter</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                  <option value="viewer">viewer</option>
                </select>
              </td>
              <td>
                <input type="checkbox" checked={u.active} onChange={e => updateUser(u, { active: e.target.checked })} />
              </td>
              <td>
                <button
                  className="btn"
                  onClick={() => {
                    const pw = prompt('New password for ' + u.email);
                    if (pw) updateUser(u, { password: pw });
                  }}
                >
                  Set
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ====== CATALOG (admin only) ======
function CatalogEditor() {
  const [items, setItems] = useState<Item[]>([]);

  const load = async () => setItems(await apiGet('/items'));
  useEffect(() => { load(); }, []);

  const updateItem = async (id: number, patch: Partial<Item>) => {
    await apiPut(`/items/${id}`, patch);
    load();
  };

  return (
    <div className="card">
      <h3>Catalog (Admin Only)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Area</th>
            <th>PAR</th>
            <th>Price</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id}>
              <td>
                <input
                  value={i.name}
                  onChange={e => updateItem(i.id, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  value={i.storage_area || ''}
                  onChange={e => updateItem(i.id, { storage_area: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={i.par || 0}
                  onChange={e => updateItem(i.id, { par: parseFloat(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={i.inv_unit_price || 0}
                  onChange={e => updateItem(i.id, { inv_unit_price: parseFloat(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={i.active ?? true}
                  onChange={e => updateItem(i.id, { active: e.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ====== TOP BAR ======
function TopBar({
  tab,
  setTab,
  allowedTabs,
}: {
  tab: string;
  setTab: (t: any) => void;
  allowedTabs: Array<string>;
}) {
  const email = localStorage.getItem('email') || '';
  const role = localStorage.getItem('role') || 'viewer';
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    window.location.reload();
  };

  const TabBtn = ({ id, label }: { id: any; label: string }) =>
    allowedTabs.includes(id) ? (
      <button className={'tab ' + (tab === id ? 'active' : '')} onClick={() => setTab(id)}>
        {label}
      </button>
    ) : null;

  return (
    <div
      className="screen-only"
      style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <TabBtn id="counts" label="Counts" />
        <TabBtn id="items" label="Items" />
        <TabBtn id="auto" label="Auto-PO" />
        <TabBtn id="ocr" label="Scan Invoice" />
        <TabBtn id="users" label="Users" />
        <TabBtn id="settings" label="Settings" />
      </div>
      <div className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>
          {email} ({role})
        </span>
        <button className="btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}

// ====== APP ROOT ======
export default function App() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'viewer';
  const allowedTabs = rolePermissions[role] || ['counts'];

  const [tab, setTab] = useState<'counts' | 'items' | 'auto' | 'settings' | 'ocr' | 'users'>(
    (allowedTabs.includes('counts')
      ? 'counts'
      : allowedTabs.includes('items')
      ? 'items'
      : allowedTabs.includes('auto')
      ? 'auto'
      : allowedTabs.includes('ocr')
      ? 'ocr'
      : allowedTabs.includes('users')
      ? 'users'
      : 'settings') as any
  );

  // backend connectivity banner
  const [backendUp, setBackendUp] = useState(true);
  useEffect(() => {
    import('../lib/ping').then(mod => mod.ping().then(ok => setBackendUp(ok)));
  }, []);

  if (!token) {
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
        {!backendUp && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: 8, margin: '8px 0' }}>
            Backend unreachable — check VITE_API_URL and CORS.
          </div>
        )}

        <h1>TOS Inventory</h1>
        <Login onLogin={() => window.location.reload()} />
        <div className="muted" style={{ marginTop: 8 }}>
          <style>{baseCss}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
      {!backendUp && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: 8, margin: '8px 0' }}>
          Backend unreachable — check VITE_API_URL and CORS.
        </div>
      )}

      <h1>TOS Inventory</h1>
      <TopBar tab={tab} setTab={setTab} allowedTabs={allowedTabs} />

      {(role === 'admin' || role === 'manager') && (
        <>
          {tab === 'counts' && <Counts />}
          {tab === 'items' && <Items />}
          {tab === 'auto' && <AutoPO />}
          {tab === 'ocr' && <InvoiceOCR />}
          {tab === 'users' && <UsersAdmin />}
          {tab === 'settings' && <SettingsPanel />}
        </>
      )}

      <style>{baseCss}</style>
    </div>
  );
}

// ====== CSS ======
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