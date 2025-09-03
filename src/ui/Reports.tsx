
import React from 'react';

function getApiBase(){
  return localStorage.getItem('VITE_API_BASE_URL')
    || (import.meta as any).env?.VITE_API_URL
    || (import.meta as any).env?.VITE_API_BASE_URL
    || '';
}
function authHeaders(){
  const t = localStorage.getItem('token');
  const h:any = { 'Content-Type':'application/json' };
  if(t) h.Authorization = `Bearer ${t}`;
  const k = localStorage.getItem('admin_key') || (import.meta as any).env?.VITE_ADMIN_KEY;
  if(k) h['x-admin-key'] = k;
  return h;
}
async function apiGet<T>(p:string){ const r=await fetch(getApiBase()+p,{headers:authHeaders()}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

type SalesRow = { date:string; net_sales:number; gross_sales:number };
type LaborRow = { date:string; hours:number; wages:number; labor_pct:number|null };
type PmixRow  = { item_name:string; qty:number; net_sales:number };
type Summary  = { start:string; end:string; totals:{ net_sales:number; gross_sales:number; labor_hours:number; labor_wages:number; labor_pct:number|null; pmix_qty:number } };

export default function Reports(){
  const today = new Date();
  const startDefault = new Date(today.getTime()-13*86400000).toISOString().slice(0,10);
  const endDefault   = new Date().toISOString().slice(0,10);

  const [start,setStart] = React.useState(startDefault);
  const [end,setEnd]     = React.useState(endDefault);

  const [summary,setSummary] = React.useState<Summary|null>(null);
  const [sales,setSales]     = React.useState<SalesRow[]>([]);
  const [labor,setLabor]     = React.useState<LaborRow[]>([]);
  const [pmix,setPmix]       = React.useState<PmixRow[]>([]);
  const [loading,setLoading] = React.useState(false);
  const [err,setErr]         = React.useState<string>('');

  const load = async()=>{
    setLoading(true); setErr('');
    try{
      const [sum, s, l, p] = await Promise.all([
        apiGet<Summary>(`/reports/summary?start=${start}&end=${end}`),
        apiGet<SalesRow[]>(`/reports/sales?start=${start}&end=${end}`),
        apiGet<LaborRow[]>(`/reports/labor?start=${start}&end=${end}`),
        apiGet<PmixRow[]>(`/reports/pmix?start=${start}&end=${end}&limit=100`),
      ]);
      setSummary(sum); setSales(s); setLabor(l); setPmix(p);
    }catch(e:any){ setErr(e.message||'Error'); }
    setLoading(false);
  };

  React.useEffect(()=>{ load(); },[]);

  const kpi = (label:string, value:any, sub?:string)=> (
    <div className="card" style={{textAlign:'center'}}>
      <div style={{fontSize:12}} className="muted">{label}</div>
      <div style={{fontSize:28,fontWeight:800}}>{value}</div>
      {sub && <div className="muted">{sub}</div>}
    </div>
  );

  const fmt = (n:number|undefined|null, p=false)=> n==null? '—' : (p? (n*100).toFixed(1)+'%' : n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}));

  return (
    <div className="card">
      <h3>Reports</h3>

      <div className="row three screen-only">
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} />
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} />
        <button className="btn" onClick={load}>{loading? 'Loading…' : 'Refresh'}</button>
      </div>

      {err && <div style={{color:'#ef4444'}}>{err}</div>}

      <div className="row three" style={{marginTop:10}}>
        {kpi('Net Sales', summary? '$'+fmt(summary.totals.net_sales) : '—')}
        {kpi('Labor Wages', summary? '$'+fmt(summary.totals.labor_wages) : '—', 'Hours: '+(summary? fmt(summary.totals.labor_hours):'—'))}
        {kpi('Labor %', summary? fmt(summary.totals.labor_pct, true): '—')}
      </div>

      <div className="card">
        <h4>Daily Sales</h4>
        <div className="catalog-wrap">
          <table className="catalog">
            <thead><tr><th>Date</th><th>Net Sales</th><th>Gross Sales</th></tr></thead>
            <tbody>
              {sales.map(r=> <tr key={r.date}><td>{r.date}</td><td>${fmt(r.net_sales)}</td><td>${fmt(r.gross_sales)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4>Daily Labor</h4>
        <div className="catalog-wrap">
          <table className="catalog">
            <thead><tr><th>Date</th><th>Hours</th><th>Wages</th><th>Labor %</th></tr></thead>
            <tbody>
              {labor.map(r=> <tr key={r.date}><td>{r.date}</td><td>{fmt(r.hours)}</td><td>${fmt(r.wages)}</td><td>{fmt(r.labor_pct,true)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4>Top PMix Items</h4>
        <div className="catalog-wrap">
          <table className="catalog">
            <thead><tr><th>Item</th><th>Qty</th><th>Net Sales</th></tr></thead>
            <tbody>
              {pmix.map((r,i)=> <tr key={r.item_name+'-'+i}><td>{r.item_name}</td><td>{r.qty}</td><td>${fmt(r.net_sales)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="muted">Food cost % requires recipe costing or invoice-to-usage mapping. We can add that next.</div>
    </div>
  );
}
