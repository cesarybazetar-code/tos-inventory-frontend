
// src/ui/Theme.tsx
import React from 'react';

export default function Theme(){
  return (
    <style>{`
      :root{
        --bg:#0b1220;
        --panel:#0f172a;
        --muted:#94a3b8;
        --text:#e5e7eb;
        --line:#273147;
        --brand1:#6366f1;
        --brand2:#a855f7;
        --ok:#10b981; --warn:#f59e0b; --err:#ef4444;
        --shadow:0 10px 30px rgba(0,0,0,.35);
        --radius:14px;
      }
      html,body,#root{height:100%}
      body{margin:0;background: radial-gradient(90% 120% at 10% -10%, #0f1027 0%, #0b1220 100%); color:var(--text);}
      .container{max-width:1200px;margin:0 auto;padding:14px 14px 80px;}
      .topbar{position:sticky;top:0;z-index:50;background:linear-gradient(180deg, rgba(11,18,32,.85), rgba(11,18,32,.55)); backdrop-filter: blur(10px); border-bottom:1px solid var(--line);}
      .brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.3px;}
      .brand-badge{background:linear-gradient(90deg,var(--brand1),var(--brand2)); color:#111; padding:6px 8px; border-radius:10px; font-weight:900}
      .tabs{display:flex;gap:10px;flex-wrap:wrap}
      .tabx{padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:#0b1220;color:var(--text);cursor:pointer; box-shadow:var(--shadow); opacity:.9}
      .tabx:hover{opacity:1}
      .tabx.active{background:linear-gradient(90deg, var(--brand1), var(--brand2)); color:white; border-color:transparent}
      .card{background:rgba(15,23,42,.85); border:1px solid var(--line); border-radius:var(--radius); box-shadow:var(--shadow); padding:16px; margin:12px 0}
      .muted{color:var(--muted)}
      input,select,button{border-radius:12px;border:1px solid #334155;background:#0b1220;color:var(--text);padding:9px 12px}
      input:focus,select:focus,button:focus{outline:none; box-shadow:0 0 0 2px rgba(99,102,241,.45)}
      .btn{background:linear-gradient(90deg,var(--brand1),var(--brand2)); border:none; color:white; cursor:pointer}
      .btn.ghost{background:transparent;border:1px solid var(--line)}
      .row{display:grid;gap:12px}
      @media(min-width:720px){ .row.two{grid-template-columns:1fr 1fr} .row.three{grid-template-columns:1fr 1fr 1fr} }
      .catalog-wrap{overflow:auto;border-radius:12px}
      table.catalog{width:100%;min-width:960px;border-collapse:separate;border-spacing:0}
      table.catalog th,table.catalog td{border-top:1px solid var(--line);padding:8px;white-space:nowrap}
      table.catalog thead th{position:sticky;top:0;background:var(--panel);z-index:3}
      .stick-left-1{position:sticky;left:0;background:var(--panel);z-index:4;box-shadow:1px 0 0 var(--line) inset}
      .stick-left-2{position:sticky;left:260px;background:var(--panel);z-index:4;box-shadow:1px 0 0 var(--line) inset}
      .stick-right-1{position:sticky;right:90px;background:var(--panel);z-index:4;box-shadow:-1px 0 0 var(--line) inset;text-align:right}
      .stick-right-2{position:sticky;right:0;background:var(--panel);z-index:4;box-shadow:-1px 0 0 var(--line) inset;text-align:center}
      tr:hover{background:rgba(99,102,241,.08)}
      .pill{font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
      .pill.ok{color:var(--ok);border-color:var(--ok)}
      .pill.err{color:var(--err);border-color:var(--err)}
      .drawer{position:fixed;top:0;right:0;height:100%;width:92%;max-width:520px;background:var(--panel);border-left:1px solid var(--line);box-shadow:var(--shadow);transform:translateX(100%);transition:transform .28s ease; z-index:60; overflow:auto}
      .drawer.open{transform:none}
      .drawer-head{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--line);padding:12px 14px;display:flex;justify-content:space-between;align-items:center}
      .drawer-body{padding:14px}
      .kvs{display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:center}
      @media(max-width:480px){ .kvs{grid-template-columns:1fr} .kvs label{opacity:.8} }
    `}</style>
  );
}
