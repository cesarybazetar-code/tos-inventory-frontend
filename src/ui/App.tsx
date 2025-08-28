
import React, { useState, useEffect } from 'react'
import InvoiceOCR from "./InvoiceOCR";

const API_DEFAULT = (import.meta as any).env?.VITE_API_BASE_URL || localStorage.getItem('VITE_API_BASE_URL') || '';

type Item = { id:number; name:string; storage_area?:string; par?:number; inv_unit_price?:number; active?:boolean }
type CountLine = { item_id:number; qty:number }
type Count = { id:number; count_date:string; storage_area?:string; lines:CountLine[] }

async function apiGet(path:string){ 
  const base = localStorage.getItem('VITE_API_BASE_URL') || API_DEFAULT; 
  const r = await fetch(base + path); 
  if(!r.ok){ throw new Error(await r.text()); }
  return r.json(); 
}
async function apiPost(path:string, body:any){
  const base = localStorage.getItem('VITE_API_BASE_URL') || API_DEFAULT;
  const r = await fetch(base + path, { 
    method:'POST', 
    headers:{ 'Content-Type':'application/json', 'x-admin-key': localStorage.getItem('admin_key') || '' }, 
    body: JSON.stringify(body) 
  });
  if(!r.ok){ alert('Error: ' + (await r.text())); throw new Error('post failed'); }
  return r.json();
}

function Settings(){
  const [api, setApi] = useState(localStorage.getItem('VITE_API_BASE_URL') || '');
  const [key, setKey] = useState(localStorage.getItem('admin_key') || '');
  const save = ()=>{
    if(api) localStorage.setItem('VITE_API_BASE_URL', api); else localStorage.removeItem('VITE_API_BASE_URL');
    localStorage.setItem('admin_key', key);
    alert('Saved. Reload the page.');
  }
  return (<div className="card"><h3>Settings</h3>
    <div className="row"><input placeholder="API URL" value={api} onChange={e=>setApi(e.target.value)} />
    <input placeholder="Admin Key (optional)" value={key} onChange={e=>setKey(e.target.value)} />
    <button className="btn" onClick={save}>Save</button></div>
    <div className="muted">Paste your API URL from Render here.</div></div>)
}

function Importer(){
  const [msg,setMsg]=useState('');
  const upload = async (file:File)=>{
    const base = localStorage.getItem('VITE_API_BASE_URL') || API_DEFAULT;
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch(base + '/import/catalog', { method:'POST', headers:{ 'x-admin-key': localStorage.getItem('admin_key') || '' }, body: fd });
    const data = await r.json();
    if(!r.ok){ alert(JSON.stringify(data)); return; }
    setMsg(`Imported ${data.created ?? 0} new, ${data.updated ?? 0} updated`);
  }
  return (<div className="card"><h3>Import Catalog CSV</h3>
    <input type="file" accept=".csv" onChange={e=> e.target.files && upload(e.target.files[0]) } />
    <div className="muted">{msg}</div></div>)
}

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
    <div className="row"><input placeholder="Item name" value={name} onChange={e=>setName(e.target.value)} />
    <input placeholder="PAR" type="number" value={par} onChange={e=>setPar(parseFloat(e.target.value||'0'))} />
    <select value={area} onChange={e=>setArea(e.target.value)}>
      {['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'].map(a=><option key={a}>{a}</option>)}
    </select><button className="btn" onClick={add}>Add / Add Location</button></div>
    {items.map(i=>(<div key={i.id} className="card small"><b>{i.name}</b> — <span className="muted">{i.storage_area||'-'}</span> | PAR: {i.par||0}</div>))}
  </div>)
}

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

  return (<div className="card"><h3>Counts — {area}</h3>
    <div className="row"><select value={area} onChange={e=>setArea(e.target.value)}>
      {['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'].map(a=><option key={a}>{a}</option>)}
    </select><button className="btn" onClick={save}>Save Count</button></div>

    <div className="row">
      <input placeholder="Add new item here" value={newName} onChange={e=>setNewName(e.target.value)} />
      <input placeholder="PAR (optional)" type="number" value={newPar} onChange={e=>setNewPar(parseFloat(e.target.value||'0'))} />
      <div></div><button className="btn" onClick={quickAdd}>Add Item Here</button>
    </div>

    {items.map(i=>(<div key={i.id} className="row"><div>{i.name}</div>
      <input type="number" value={lines[i.id] || ''} onChange={e=>setLines(prev=>({...prev,[i.id]:parseFloat(e.target.value||'0')}))} /></div>))}
    <div className="muted">{items.length} item(s) in this area</div></div>)
}

function AutoPO(){
  const [area,setArea]=useState('Cooking Line'); const [rows,setRows]=useState<any[]>([]);
  const run = async()=>{ const data = await apiGet(`/auto-po?storage_area=${encodeURIComponent(area)}`); setRows(data.lines||[]); }
  useEffect(()=>{run();},[area]);
  return (<div className="card"><h3>Auto‑PO</h3>
    <div className="row"><select value={area} onChange={e=>setArea(e.target.value)}>
      {['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'].map(a=><option key={a}>{a}</option>)}
    </select><button className="btn" onClick={run}>Refresh</button></div>
    <table><thead><tr><th>Item</th><th>Area</th><th>On Hand</th><th>PAR</th><th>Suggested</th></tr></thead>
      <tbody>{rows.map((r,i)=>(<tr key={i}><td>{r.name}</td><td>{r.storage_area||'-'}</td><td>{r.on_hand}</td><td>{r.par}</td><td>{r.suggested_order_qty}</td></tr>))}</tbody>
    </table></div>)
}

export default function App(){
  const [tab,setTab]=useState<'counts'|'items'|'auto'|'settings'>('counts')
  return (<div style={{fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Arial',margin:'16px'}}>
    <h1>TOS Inventory</h1>
    <div style={{display:'flex',gap:8,marginBottom:12}}>
      <button className={'tab '+(tab==='counts'?'active':'')} onClick={()=>setTab('counts')}>Counts</button>
      <button className={'tab '+(tab==='items'?'active':'')} onClick={()=>setTab('items')}>Items</button>
      <button className={'tab '+(tab==='auto'?'active':'')} onClick={()=>setTab('auto')}>Auto‑PO</button>
      <button className={'tab '+(tab==='settings'?'active':'')} onClick={()=>setTab('settings')}>Settings</button>
      <button className={'tab '+(tab==='ocr'?'active':'')} onClick={()=>setTab('ocr')}>Scan Invoice</button>
    </div>
    <Importer/>
    {tab==='counts' && <Counts/>}
    {tab==='items' && <Items/>}
    {tab==='auto' && <AutoPO/>}
    {tab==='settings' && <Settings/>}
    {tab==='ocr' && <InvoiceOCR/>}
    <style>{`
      .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
      .tab{padding:8px 12px;border:1px solid #000;border-radius:10px;background:#fff}
      .tab.active{background:#000;color:#fff}
      .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
      .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0}
      input,select{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{padding:8px;border-top:1px solid #eee;text-align:left}
    `}</style>
  </div>)
}
