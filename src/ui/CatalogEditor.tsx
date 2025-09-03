
// src/ui/CatalogEditor.tsx
import React from 'react';

const LOCATIONS = ['Cooking Line','Meat','Seafood','Dairy','Produce','Dry & Other','Freezer','Bev & Coffee','Grocery'];
const ORDER_UNITS = ['case','box','bag','bottle','each','lb','oz','gallon','liter'];
const INV_UNITS   = ['each','lb','oz','g','kg','ml','liter','gallon'];
const PRICE_BASIS = ['per_unit','per_case','conversion'] as const;

type Item = {
  id:number; name:string; storage_area:string|null; par:number|null;
  order_unit?:string|null; inventory_unit?:string|null; case_size?:number|null; conversion?:number|null;
  order_unit_price?:number|null; price_basis?:'per_unit'|'per_case'|'conversion'|null;
  inv_unit_price?:number|null; active?:boolean|null;
};

function getApiBase(){ return localStorage.getItem('VITE_API_BASE_URL') || (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL || ''; }
function authHeaders(){ const t=localStorage.getItem('token'); const h:any={'Content-Type':'application/json'}; if(t) h.Authorization=`Bearer ${t}`; const k=localStorage.getItem('admin_key')||(import.meta as any).env?.VITE_ADMIN_KEY; if(k) h['x-admin-key']=k; return h;}
async function apiGet<T>(p:string){ const r=await fetch(getApiBase()+p,{headers:authHeaders()}); if(!r.ok) throw new Error(await r.text()); return r.json() }
async function apiPut<T>(p:string,b:any){ const r=await fetch(getApiBase()+p,{method:'PUT',headers:authHeaders(),body:JSON.stringify(b)}); if(!r.ok) throw new Error(await r.text()); return r.json() }

function perUnitPreview(it:Item){
  const basis=it.price_basis||undefined, oup=it.order_unit_price??undefined, cs=it.case_size??undefined, conv=it.conversion??undefined;
  const isCaseLike = (s?:string|null)=> (s||'').match(/case|cs|box|pack/i);
  let v: number|undefined;
  if(basis==='per_unit' && (it.inv_unit_price||0)>0) v = it.inv_unit_price!;
  else if((oup||0)>0){ if((conv||0)>0) v=(oup as number)/(conv as number); else if((cs||0)>0 && isCaseLike(it.order_unit)) v=(oup as number)/(cs as number); else v=oup!; }
  else if((it.inv_unit_price||0)>0) v = it.inv_unit_price!;
  return v===undefined?'—':v.toFixed(2);
}

export default function CatalogEditor(){
  const [items,setItems]=React.useState<Item[]>([]);
  const [search,setSearch]=React.useState(''); const [loc,setLoc]=React.useState('');
  const [drawer,setDrawer]=React.useState<Item|null>(null);
  const [saving,setSaving]=React.useState<Record<number,'idle'|'saving'|'ok'|'err'>>({});
  const timers=React.useRef<Record<number,any>>({});

  const load=async()=> setItems(await apiGet<Item[]>('/items'));
  React.useEffect(()=>{ load(); },[]);

  const mark=(id:number,s:'idle'|'saving'|'ok'|'err')=> setSaving(p=>({...p,[id]:s}));
  const save=(it:Item,patch:Partial<Item>)=>{
    mark(it.id,'saving');
    if(timers.current[it.id]) clearTimeout(timers.current[it.id]);
    timers.current[it.id]=setTimeout(async()=>{
      try{ await apiPut(`/items/${it.id}`,{...it,...patch}); setItems(prev=>prev.map(x=>x.id===it.id?{...x,...patch}:x)); mark(it.id,'ok'); setTimeout(()=>mark(it.id,'idle'),900); }
      catch{ mark(it.id,'err'); }
    },350);
  };

  const filtered = items.filter(i=>{
    if(loc && (i.storage_area||'')!==loc) return false;
    if(search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="card">
        <h3>Catalog (Admin)</h3>
        <div className="row two">
          <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select value={loc} onChange={e=>setLoc(e.target.value)}>
            <option value="">All locations</option>
            {LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="muted" style={{marginTop:6}}>
          Quick edit common fields in table. Click <b>Edit</b> to open the full drawer with all pack/price options.
        </div>
      </div>

      <div className="catalog-wrap">
        <table className="catalog">
          <thead>
            <tr>
              <th className="stick-left-1" style={{width:260}}>Name</th>
              <th className="stick-left-2" style={{width:170}}>Location</th>
              <th style={{width:100}}>PAR</th>
              <th style={{width:140}}>Order Unit Price</th>
              <th style={{width:140}}>Price Basis</th>
              <th className="stick-right-1" style={{width:140}}>Per-Unit</th>
              <th style={{width:95}}>Edit</th>
              <th className="stick-right-2" style={{width:90}}>Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(it=>{
              const pu=perUnitPreview(it); const st=saving[it.id]||'idle';
              return (
                <tr key={it.id}>
                  <td className="stick-left-1">
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input value={it.name} onChange={e=>save(it,{name:e.target.value})}/>
                      {st==='saving'&&<span className="pill">Saving…</span>}
                      {st==='ok'&&<span className="pill ok">✓</span>}
                      {st==='err'&&<span className="pill err">!</span>}
                    </div>
                  </td>
                  <td className="stick-left-2">
                    <select value={it.storage_area||''} onChange={e=>save(it,{storage_area:e.target.value||null})}>
                      <option value="">—</option>
                      {LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>
                  <td><input type="number" value={it.par??0} onChange={e=>save(it,{par:parseFloat(e.target.value||'0')})}/></td>
                  <td><input type="number" step="0.01" value={it.order_unit_price??''} onChange={e=>save(it,{order_unit_price:e.target.value===''?null:parseFloat(e.target.value)})}/></td>
                  <td>
                    <select value={(it.price_basis||'') as any} onChange={e=>save(it,{price_basis:(e.target.value||null) as any})}>
                      <option value="">—</option>
                      {PRICE_BASIS.map(x=><option key={x} value={x}>{x}</option>)}
                    </select>
                  </td>
                  <td className="stick-right-1"><span className="muted">{pu}</span></td>
                  <td><button className="btn ghost" onClick={()=>setDrawer(it)}>Edit</button></td>
                  <td className="stick-right-2"><input type="checkbox" checked={it.active ?? true} onChange={e=>save(it,{active:e.target.checked})}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drawer editor */}
      <div className={'drawer '+(drawer?'open':'')}>
        {drawer && (
          <>
            <div className="drawer-head">
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <b>Edit Item</b> <span className="muted">#{drawer.id}</span>
              </div>
              <button className="btn ghost" onClick={()=>setDrawer(null)}>Close</button>
            </div>
            <div className="drawer-body">
              <div className="card">
                <div className="kvs">
                  <label>Name</label>
                  <input value={drawer.name} onChange={e=>{ const v=e.target.value; setDrawer({...drawer,name:v}); save(drawer,{name:v}); }} />
                  <label>Location</label>
                  <select value={drawer.storage_area||''} onChange={e=>{ const v=e.target.value||null; setDrawer({...drawer,storage_area:v}); save(drawer,{storage_area:v}); }}>
                    <option value="">—</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                  <label>PAR</label>
                  <input type="number" value={drawer.par??0} onChange={e=>{ const v=parseFloat(e.target.value||'0'); setDrawer({...drawer,par:v}); save(drawer,{par:v}); }} />

                  <label>Order Unit</label>
                  <select value={drawer.order_unit||''} onChange={e=>{ const v=e.target.value||null; setDrawer({...drawer,order_unit:v}); save(drawer,{order_unit:v}); }}>
                    <option value="">—</option>{ORDER_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <label>Inventory Unit</label>
                  <select value={drawer.inventory_unit||''} onChange={e=>{ const v=e.target.value||null; setDrawer({...drawer,inventory_unit:v}); save(drawer,{inventory_unit:v}); }}>
                    <option value="">—</option>{INV_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <label>Case Size</label>
                  <input type="number" placeholder="e.g. 40" value={drawer.case_size??''}
                         onChange={e=>{ const v=e.target.value===''?null:parseFloat(e.target.value); setDrawer({...drawer,case_size:v}); save(drawer,{case_size:v}); }} />
                  <label>Conversion</label>
                  <input type="number" placeholder="e.g. 12" value={drawer.conversion??''}
                         onChange={e=>{ const v=e.target.value===''?null:parseFloat(e.target.value); setDrawer({...drawer,conversion:v}); save(drawer,{conversion:v}); }} />
                  <label>Order Unit Price</label>
                  <input type="number" step="0.01" placeholder="e.g. 120.00" value={drawer.order_unit_price??''}
                         onChange={e=>{ const v=e.target.value===''?null:parseFloat(e.target.value); setDrawer({...drawer,order_unit_price:v}); save(drawer,{order_unit_price:v}); }} />
                  <label>Price Basis</label>
                  <select value={drawer.price_basis||''} onChange={e=>{ const v=(e.target.value||null) as any; setDrawer({...drawer,price_basis:v}); save(drawer,{price_basis:v}); }}>
                    <option value="">—</option>{PRICE_BASIS.map(x=><option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <div className="muted">Per-unit preview: <b>{perUnitPreview(drawer)}</b></div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
