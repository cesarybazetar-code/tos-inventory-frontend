
// src/ui/TopNav.tsx
import React from 'react';

export default function TopNav({
  tab, setTab, allowedTabs
}: { tab:string; setTab:(t:string)=>void; allowedTabs:string[] }) {
  const email = localStorage.getItem('email') || '';
  const role  = localStorage.getItem('role') || 'viewer';
  const logout = () => { localStorage.clear(); location.reload(); };

  const Btn = (id:string, label:string) =>
    allowedTabs.includes(id) ? (
      <button className={'tabx '+(tab===id?'active':'')} onClick={()=>setTab(id)}>{label}</button>
    ) : null;

  return (
    <div className="topbar">
      <div className="container" style={{display:'flex',gap:14,alignItems:'center',justifyContent:'space-between',padding:'10px 14px'}}>
        <div className="brand">
          <span className="brand-badge">TOS</span> <span>Inventory</span>
        </div>
        <div className="tabs">
          {Btn('counts','Counts')}
          {Btn('catalog','Catalog')}
          {Btn('items','Items')}
          {Btn('auto','Auto-PO')}
          {Btn('ocr','Scan Invoice')}
          {Btn('users','Users')}
          {Btn('reports','Reports')}
          {Btn('settings','Settings')}
        </div>
        <div className="muted" style={{display:'flex',gap:8,alignItems:'center'}}>
          <span>{email} ({role})</span>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  );
}
