import React, { useEffect, useState } from "react";

/** Reuse same base URL and token storage as the rest of the app */
const API_DEFAULT =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  localStorage.getItem("VITE_API_BASE_URL") ||
  "";

const getApiBase = () => localStorage.getItem("VITE_API_BASE_URL") || API_DEFAULT || "";
const getToken = () => localStorage.getItem("token") || "";

type Item = {
  id: number;
  name: string;
  storage_area?: string | null;
  par?: number;
  inv_unit_price?: number;
  active?: boolean;
};

async function apiGet(path: string) {
  const r = await fetch(getApiBase() + path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/** Print-friendly sheet for counts */
export default function CountPrintSheet() {
  const [area, setArea] = useState("Cooking Line");
  const [items, setItems] = useState<Item[]>([]);
  const areas = [
    "Cooking Line",
    "Meat",
    "Seafood",
    "Dairy",
    "Produce",
    "Dry & Other",
    "Freezer",
    "Bev & Coffee",
    "Grocery",
  ];

  const load = async () => {
    const data: Item[] = await apiGet("/items?area=" + encodeURIComponent(area));
    setItems(data);
  };

  // Load on area change
  useEffect(() => {
    load();
  }, [area]);

  // Optional: auto-open print when items load (uncomment if you want this behavior)
  // useEffect(() => {
  //   if (items.length) {
  //     setTimeout(() => window.print(), 300);
  //   }
  // }, [items]);

  return (
    <div className="print-wrap">
      {/* Controls only visible on screen, hidden on paper */}
      <div className="screen-only controls card">
        <h3>Print Count Sheet</h3>
        <div className="row">
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <button className="btn" onClick={load}>Refresh</button>
          <button className="btn" onClick={() => window.print()}>Print</button>
        </div>
        <div className="muted">{items.length} item(s) in this area</div>
      </div>

      {/* Printable header */}
      <div className="paper-only header">
        <div>
          <h2 style={{ margin: 0 }}>Inventory Count Sheet</h2>
          <div className="muted-sm">Area: <b>{area}</b></div>
        </div>
        <div className="muted-sm">
          Date: ____________ &nbsp;&nbsp; Counter: __________________
        </div>
      </div>

      {/* Printable table */}
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: "40%" }}>Item</th>
            <th style={{ width: "20%" }}>Area</th>
            <th style={{ width: "20%" }}>Qty</th>
            <th style={{ width: "20%" }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.storage_area || "-"}</td>
              <td className="blank-cell"></td>
              <td className="blank-cell"></td>
            </tr>
          ))}
          {/* add a few blank rows */}
          {Array.from({ length: 8 }).map((_, idx) => (
            <tr key={"blank-" + idx}>
              <td className="blank-cell"></td>
              <td className="blank-cell"></td>
              <td className="blank-cell"></td>
              <td className="blank-cell"></td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
        .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:6px 0}
        select{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
        .muted{color:#6b7280}
        .muted-sm{color:#6b7280;font-size:12px}

        /* Print layout */
        .print-wrap{margin: 10px 0}
        .header{display:flex;justify-content:space-between;align-items:flex-end;margin:8px 0 12px}
        .print-table{width:100%;border-collapse:collapse}
        .print-table th, .print-table td{border:1px solid #000;padding:8px}
        .blank-cell{height:28px}

        /* Hide controls when printing */
        @media print {
          .screen-only{display:none !important;}
          body{margin:0}
          .print-wrap{margin:0}
          .paper-only{display:block !important;}
          .print-table th, .print-table td{font-size:12pt}
        }
        /* Hide paper-only header on screen */
        .paper-only{display:none;}
        @media (max-width: 640px){
          .row{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}