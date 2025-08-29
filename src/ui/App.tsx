import React, { useState, useEffect } from 'react';
import InvoiceOCR from "./InvoiceOCR";

const API_DEFAULT =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  localStorage.getItem("VITE_API_BASE_URL") ||
  "";

function getApiBase() {
  return localStorage.getItem("VITE_API_BASE_URL") || API_DEFAULT;
}

function getToken() {
  return localStorage.getItem("token") || "";
}

async function apiGet(path: string) {
  const r = await fetch(getApiBase() + path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiPost(path: string, body: any) {
  const r = await fetch(getApiBase() + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      "x-admin-key": localStorage.getItem("admin_key") || "",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---------------- Components ----------------
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const fd = new URLSearchParams();
    fd.append("username", email);
    fd.append("password", password);

    const r = await fetch(getApiBase() + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: fd,
    });
    if (!r.ok) {
      alert("Login failed");
      return;
    }
    const data = await r.json();
    localStorage.setItem("token", data.access_token);
    alert("Login success. Reload page.");
    window.location.reload();
  };

  return (
    <div className="card">
      <h3>Login</h3>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn" onClick={login}>
        Login
      </button>
    </div>
  );
}

type Item = {
  id: number;
  name: string;
  storage_area?: string;
  par?: number;
  inv_unit_price?: number;
  active?: boolean;
};

function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [area, setArea] = useState("Cooking Line");
  const [par, setPar] = useState(0);

  const load = async () => setItems(await apiGet("/items"));
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    await apiPost("/items", { name, storage_area: area, par });
    setName("");
    setPar(0);
    load();
  };

  return (
    <div className="card">
      <h3>Items</h3>
      <div className="row">
        <input
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="PAR"
          type="number"
          value={par}
          onChange={(e) => setPar(parseFloat(e.target.value || "0"))}
        />
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          {[
            "Cooking Line",
            "Meat",
            "Seafood",
            "Dairy",
            "Produce",
            "Dry & Other",
            "Freezer",
            "Bev & Coffee",
            "Grocery",
          ].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn" onClick={add}>
          Add
        </button>
      </div>
      {items.map((i) => (
        <div key={i.id} className="card small">
          <b>{i.name}</b> — <span className="muted">{i.storage_area || "-"}</span>{" "}
          | PAR: {i.par || 0}
        </div>
      ))}
    </div>
  );
}

function Counts() {
  const [items, setItems] = useState<Item[]>([]);
  const [area, setArea] = useState("Cooking Line");
  const [lines, setLines] = useState<Record<number, number>>({});

  const load = async () =>
    setItems(await apiGet("/items?area=" + encodeURIComponent(area)));
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
    await apiPost("/counts", payload);
    setLines({});
    load();
  };

  return (
    <div className="card">
      <h3>Counts — {area}</h3>
      <div className="row">
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          {[
            "Cooking Line",
            "Meat",
            "Seafood",
            "Dairy",
            "Produce",
            "Dry & Other",
            "Freezer",
            "Bev & Coffee",
            "Grocery",
          ].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn" onClick={save}>
          Save Count
        </button>
      </div>

      {items.map((i) => (
        <div key={i.id} className="row">
          <div>{i.name}</div>
          <input
            type="number"
            value={lines[i.id] || ""}
            onChange={(e) =>
              setLines((prev) => ({
                ...prev,
                [i.id]: parseFloat(e.target.value || "0"),
              }))
            }
          />
        </div>
      ))}
    </div>
  );
}

function AutoPO() {
  const [area, setArea] = useState("Cooking Line");
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
      <div className="row">
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          {[
            "Cooking Line",
            "Meat",
            "Seafood",
            "Dairy",
            "Produce",
            "Dry & Other",
            "Freezer",
            "Bev & Coffee",
            "Grocery",
          ].map((a) => (
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

export default function App() {
  const [tab, setTab] = useState<
    "counts" | "items" | "auto" | "ocr" | "login"
  >("counts");

  const token = getToken();

  return (
    <div
      style={{
        fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Arial",
        margin: "16px",
      }}
    >
      <h1>TOS Inventory</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          className={"tab " + (tab === "counts" ? "active" : "")}
          onClick={() => setTab("counts")}
        >
          Counts
        </button>
        <button
          className={"tab " + (tab === "items" ? "active" : "")}
          onClick={() => setTab("items")}
        >
          Items
        </button>
        <button
          className={"tab " + (tab === "auto" ? "active" : "")}
          onClick={() => setTab("auto")}
        >
          Auto-PO
        </button>
        <button
          className={"tab " + (tab === "ocr" ? "active" : "")}
          onClick={() => setTab("ocr")}
        >
          Scan Invoice
        </button>
        <button
          className={"tab " + (tab === "login" ? "active" : "")}
          onClick={() => setTab("login")}
        >
          Login
        </button>
      </div>

      {!token && tab !== "login" && (
        <div className="muted">⚠️ You are not logged in.</div>
      )}

      {tab === "counts" && <Counts />}
      {tab === "items" && <Items />}
      {tab === "auto" && <AutoPO />}
      {tab === "ocr" && <InvoiceOCR />}
      {tab === "login" && <Login />}

      <style>{`
        .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
        .tab{padding:8px 12px;border:1px solid #000;border-radius:10px;background:#fff}
        .tab.active{background:#000;color:#fff}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0}
        input,select{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{padding:8px;border-top:1px solid #eee;text-align:left}
        .muted{color:#6b7280;font-size:12px}
      `}</style>
    </div>
  );
}