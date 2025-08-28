import React, { useState, useEffect } from "react";
import InvoiceOCR from "./InvoiceOCR";
import ItemEditor from "./ItemEditor"; // <— full catalog editor (add/edit/delete)

// ---------- API helpers ----------
const envBase = (import.meta as any).env?.VITE_API_BASE_URL || "";
const getBase = () =>
  (localStorage.getItem("VITE_API_BASE_URL") || envBase || "").replace(/\/+$/, "");
const join = (b: string, p: string) => `${b}${p.startsWith("/") ? p : `/${p}`}`;

type Item = {
  id: number;
  name: string;
  storage_area?: string | null;
  par?: number;
  inv_unit_price?: number;
  active?: boolean;
};
type CountLine = { item_id: number; qty: number };
type Count = { id: number; count_date: string; storage_area?: string; lines: CountLine[] };

async function apiGet<T = any>(path: string): Promise<T> {
  const base = getBase();
  const r = await fetch(join(base, path));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const base = getBase();
  const r = await fetch(join(base, path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": localStorage.getItem("admin_key") || "",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiDelete(path: string): Promise<void> {
  const base = getBase();
  const r = await fetch(join(base, path), {
    method: "DELETE",
    headers: { "x-admin-key": localStorage.getItem("admin_key") || "" },
  });
  if (!r.ok) throw new Error(await r.text());
}

// ---------- Settings ----------
function Settings() {
  const [api, setApi] = useState(localStorage.getItem("VITE_API_BASE_URL") || envBase || "");
  const [key, setKey] = useState(localStorage.getItem("admin_key") || "");
  const [msg, setMsg] = useState("");
  const [health, setHealth] = useState<string>("");

  const save = () => {
    if (api) localStorage.setItem("VITE_API_BASE_URL", api);
    else localStorage.removeItem("VITE_API_BASE_URL");
    localStorage.setItem("admin_key", key);
    setMsg("Saved. Reload the page to apply everywhere.");
    setTimeout(() => setMsg(""), 2000);
  };

  const ping = async () => {
    try {
      const base = (localStorage.getItem("VITE_API_BASE_URL") || api || envBase || "").trim();
      if (!base) {
        setHealth("Set API URL first.");
        return;
      }
      const h1 = await fetch(join(base.replace(/\/+$/, ""), "/health")).then((r) => r.text());
      const h2 = await fetch(join(base.replace(/\/+$/, ""), "/ocr/health")).then((r) => r.text());
      setHealth(`/health -> ${h1}\n/ocr/health -> ${h2}`);
    } catch (e: any) {
      setHealth(e.message || "Health check failed");
    }
  };

  const clear = () => {
    localStorage.removeItem("VITE_API_BASE_URL");
    localStorage.removeItem("admin_key");
    setApi("");
    setKey("");
    setMsg("Cleared. Enter values and Save again.");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className="card">
      <h3>Settings</h3>
      <div className="row">
        <input
          placeholder="API Base URL (e.g. https://tos-inventory-backend.onrender.com)"
          value={api}
          onChange={(e) => setApi(e.target.value)}
        />
        <input placeholder="Admin Key" value={key} onChange={(e) => setKey(e.target.value)} />
      </div>
      <div className="row">
        <button className="btn" onClick={save}>
          Save
        </button>
        <button className="btn" onClick={clear}>
          Clear
        </button>
        <button className="btn" onClick={ping}>
          Health Check
        </button>
      </div>
      {msg && <div className="muted">{msg}</div>}
      {health && (
        <pre
          style={{
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            padding: 8,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            marginTop: 8,
          }}
        >
          {health}
        </pre>
      )}
    </div>
  );
}

// ---------- Importer (CSV) - optional but kept ----------
function Importer() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    setMsg("");
    try {
      const base = getBase();
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(join(base, "/import/catalog"), {
        method: "POST",
        headers: { "x-admin-key": localStorage.getItem("admin_key") || "" },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
      setMsg(`Imported ${data.created ?? 0} new, ${data.updated ?? 0} updated`);
    } catch (e: any) {
      setMsg(e.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h3>Import Catalog CSV (optional)</h3>
      <input type="file" accept=".csv" onChange={(e) => e.target.files && upload(e.target.files[0])} />
      <div className="muted">{busy ? "Uploading…" : msg}</div>
    </div>
  );
}

// ---------- Items (Quick Add) ----------
function ItemsQuick() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [area, setArea] = useState("Cooking Line");
  const [par, setPar] = useState<number>(0);

  const AREAS = [
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
    try {
      setItems(await apiGet<Item[]>("/items"));
    } catch (e: any) {
      alert(e.message || "Failed to load items");
    }
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await apiPost("/items", { name: name.trim(), storage_area: area, par });
      setName("");
      setPar(0);
      load();
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  };

  return (
    <div className="card">
      <h3>Items — Quick Add / Add Location</h3>
      <div className="row">
        <input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="PAR"
          type="number"
          value={Number.isFinite(par) ? par : 0}
          onChange={(e) => setPar(parseFloat(e.target.value || "0"))}
        />
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn" onClick={add}>
          Add / Add Location
        </button>
      </div>

      {items.map((i) => (
        <div key={i.id} className="card small">
          <b>{i.name}</b> — <span className="muted">{i.storage_area || "-"}</span> | PAR: {i.par || 0}
        </div>
      ))}
    </div>
  );
}

// ---------- Counts ----------
function Counts() {
  const [items, setItems] = useState<Item[]>([]);
  const [area, setArea] = useState("Cooking Line");
  const [lines, setLines] = useState<Record<number, number>>({});
  const [newName, setNewName] = useState("");
  const [newPar, setNewPar] = useState<number>(0);

  const AREAS = [
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
    try {
      setItems(await apiGet<Item[]>(`/items?area=${encodeURIComponent(area)}`));
    } catch (e: any) {
      alert(e.message || "Failed to load items");
    }
  };
  useEffect(() => {
    load();
  }, [area]);

  const save = async () => {
    const payload = {
      storage_area: area,
      lines: Object.entries(lines)
        .filter(([_, q]) => (parseFloat(q as any) || 0) > 0)
        .map(([id, qty]) => ({ item_id: parseInt(id), qty: Number(qty) })),
    };
    try {
      await apiPost("/counts", payload);
      setLines({});
      load();
      alert("Count saved.");
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  };

  const quickAdd = async () => {
    if (!newName.trim()) return;
    try {
      await apiPost("/items", { name: newName.trim(), storage_area: area, par: newPar || 0 });
      setNewName("");
      setNewPar(0);
      load();
    } catch (e: any) {
      alert(e.message || "Add failed");
    }
  };

  return (
    <div className="card">
      <h3>Counts — {area}</h3>
      <div className="row">
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn" onClick={save}>
          Save Count
        </button>
      </div>

      <div className="row">
        <input
          placeholder="Add new item here"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          placeholder="PAR (optional)"
          type="number"
          value={Number.isFinite(newPar) ? newPar : 0}
          onChange={(e) => setNewPar(parseFloat(e.target.value || "0"))}
        />
        <div></div>
        <button className="btn" onClick={quickAdd}>
          Add Item Here
        </button>
      </div>

      {items.map((i) => (
        <div key={i.id} className="row">
          <div>{i.name}</div>
          <input
            type="number"
            value={lines[i.id] ?? ""}
            onChange={(e) =>
              setLines((prev) => ({ ...prev, [i.id]: parseFloat(e.target.value || "0") }))
            }
          />
        </div>
      ))}
      <div className="muted">{items.length} item(s) in this area</div>
    </div>
  );
}

// ---------- Auto-PO ----------
function AutoPO() {
  const [area, setArea] = useState("Cooking Line");
  const [rows, setRows] = useState<
    { name: string; storage_area?: string | null; on_hand: number; par: number; suggested_order_qty: number }[]
  >([]);

  const AREAS = [
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

  const run = async () => {
    try {
      const data = await apiGet<{ lines: any[] }>(`/auto-po?storage_area=${encodeURIComponent(area)}`);
      setRows(data.lines || []);
    } catch (e: any) {
      alert(e.message || "Failed to fetch Auto-PO");
    }
  };
  useEffect(() => {
    run();
  }, [area]);

  return (
    <div className="card">
      <h3>Auto-PO</h3>
      <div className="row">
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          {AREAS.map((a) => (
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
              <td>{r.storage_area || "-"}</td>
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

// ---------- App ----------
export default function App() {
  const [tab, setTab] = useState<"counts" | "items" | "catalog" | "auto" | "settings" | "ocr">(
    "counts"
  );

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Arial", margin: "16px" }}>
      <h1 style={{ marginBottom: 8 }}>TOS Inventory</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button className={"tab " + (tab === "counts" ? "active" : "")} onClick={() => setTab("counts")}>
          Counts
        </button>
        <button className={"tab " + (tab === "items" ? "active" : "")} onClick={() => setTab("items")}>
          Items (Quick Add)
        </button>
        <button className={"tab " + (tab === "catalog" ? "active" : "")} onClick={() => setTab("catalog")}>
          Catalog
        </button>
        <button className={"tab " + (tab === "auto" ? "active" : "")} onClick={() => setTab("auto")}>
          Auto-PO
        </button>
        <button className={"tab " + (tab === "ocr" ? "active" : "")} onClick={() => setTab("ocr")}>
          Scan Invoice
        </button>
        <button className={"tab " + (tab === "settings" ? "active" : "")} onClick={() => setTab("settings")}>
          Settings
        </button>
      </div>

      {/* Optional CSV importer, always visible (you can move it under Catalog tab if you prefer) */}
      <Importer />

      {tab === "counts" ? <Counts /> : null}
      {tab === "items" ? <ItemsQuick /> : null}
      {tab === "catalog" ? <ItemEditor /> : null}
      {tab === "auto" ? <AutoPO /> : null}
      {tab === "ocr" ? <InvoiceOCR /> : null}
      {tab === "settings" ? <Settings /> : null}

      <style>{`
        .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
        .tab{padding:8px 12px;border:1px solid #000;border-radius:10px;background:#fff}
        .tab.active{background:#000;color:#fff}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
        .card.small{padding:10px}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0}
        input,select{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{padding:8px;border-top:1px solid #eee;text-align:left}
        @media (max-width: 680px){
          .row{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}