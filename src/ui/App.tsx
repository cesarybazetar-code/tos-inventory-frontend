import React, { useEffect, useMemo, useState } from "react";
import InvoiceOCR from "./InvoiceOCR";

/** ========================
 *  Config / Types
 *  =======================*/
type Role = "admin" | "manager" | "viewer";
type User = { id: number; email: string; name?: string; role: Role; active: boolean };

type Item = { id: number; name: string; storage_area?: string; par?: number; inv_unit_price?: number; active?: boolean };
type CountLine = { item_id: number; qty: number };
type Count = { id: number; count_date: string; storage_area?: string; lines: CountLine[] };

const ENV_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "";
const getBase = () => localStorage.getItem("VITE_API_BASE_URL") || ENV_BASE || "";

/** Build headers that include Bearer token (if logged in) and/or x-admin-key (legacy) */
const authHeaders = () => {
  const h: Record<string, string> = {};
  const token = localStorage.getItem("token");
  const adminKey = localStorage.getItem("admin_key");
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (adminKey) h["x-admin-key"] = adminKey;
  return h;
};

async function apiGet<T = any>(path: string): Promise<T> {
  const r = await fetch(getBase() + path, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const r = await fetch(getBase() + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiUpload<T = any>(path: string, fd: FormData): Promise<T> {
  const r = await fetch(getBase() + path, { method: "POST", headers: authHeaders(), body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/** ========================
 *  Small helpers
 *  =======================*/
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

function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const loggedIn = !!user;
  const hasRole = (...roles: Role[]) => (user ? roles.includes(user.role) : false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return { user, setUser, loggedIn, hasRole, logout };
}

/** ========================
 *  Screens / Cards
 *  =======================*/
function LoginCard({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      // FastAPI OAuth2PasswordRequestForm expects x-www-form-urlencoded
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);

      const r = await fetch(getBase() + "/auth/login", {
        method: "POST",
        headers: authHeaders(), // allows admin_key path if you keep it enabled
        body,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Login failed");
      // save token + user
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLoggedIn(data.user);
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h3>Login</h3>
      <div className="row">
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn" onClick={submit} disabled={busy || !email || !password}>
        {busy ? "Signing in…" : "Sign In"}
      </button>
      {err && <div style={{ color: "red", marginTop: 8 }}>{err}</div>}
      <div className="muted" style={{ marginTop: 8 }}>
        Tip: You can still set an Admin Key in Settings for maintenance access.
      </div>
    </div>
  );
}

function Settings({ onChanged }: { onChanged: () => void }) {
  const [api, setApi] = useState(localStorage.getItem("VITE_API_BASE_URL") || getBase());
  const [key, setKey] = useState(localStorage.getItem("admin_key") || "");
  const save = () => {
    if (api) localStorage.setItem("VITE_API_BASE_URL", api);
    else localStorage.removeItem("VITE_API_BASE_URL");
    if (key) localStorage.setItem("admin_key", key);
    else localStorage.removeItem("admin_key");
    alert("Saved. Reloading the data.");
    onChanged();
  };
  return (
    <div className="card">
      <h3>Settings</h3>
      <div className="row">
        <input placeholder="API URL (Render)" value={api} onChange={(e) => setApi(e.target.value)} />
        <input placeholder="Admin Key (optional)" value={key} onChange={(e) => setKey(e.target.value)} />
      </div>
      <button className="btn" onClick={save}>Save</button>
      <div className="muted">API Base used right now: {getBase() || "(not set)"}</div>
    </div>
  );
}

function Importer() {
  const [msg, setMsg] = useState("");
  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const data = await apiUpload("/import/catalog", fd);
      setMsg(`Imported ${data.created ?? 0} new, ${data.updated ?? 0} updated`);
    } catch (e: any) {
      setMsg(e.message || "Import failed");
    }
  };
  return (
    <div className="card">
      <h3>Import Catalog CSV</h3>
      <input type="file" accept=".csv" onChange={(e) => e.target.files && upload(e.target.files[0])} />
      <div className="muted">{msg}</div>
    </div>
  );
}

function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [par, setPar] = useState(0);

  const load = async () => setItems(await apiGet<Item[]>("/items"));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    await apiPost("/items", { name, storage_area: area, par });
    setName(""); setPar(0);
    load();
  };

  return (
    <div className="card">
      <h3>Items (Add / Add Location)</h3>
      <div className="row">
        <input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="PAR" type="number" value={par} onChange={(e) => setPar(parseFloat(e.target.value || "0"))} />
        <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
        <button className="btn" onClick={add}>Add / Add Location</button>
      </div>
      {items.map((i) => (
        <div key={i.id} className="card small">
          <b>{i.name}</b> — <span className="muted">{i.storage_area || "-"}</span> | PAR: {i.par || 0}
        </div>
      ))}
    </div>
  );
}

function Counts() {
  const [items, setItems] = useState<Item[]>([]);
  const [area, setArea] = useState(AREAS[0]);
  const [lines, setLines] = useState<Record<number, number>>({});
  const [newName, setNewName] = useState("");
  const [newPar, setNewPar] = useState(0);

  const load = async () => setItems(await apiGet<Item[]>("/items?area=" + encodeURIComponent(area)));
  useEffect(() => { load(); }, [area]);

  const save = async () => {
    const payload = {
      storage_area: area,
      lines: Object.entries(lines)
        .filter(([, q]) => (parseFloat(q as any) || 0) > 0)
        .map(([id, qty]) => ({ item_id: parseInt(id), qty: Number(qty) })),
    };
    await apiPost("/counts", payload);
    setLines({});
    load();
  };

  const quickAdd = async () => {
    if (!newName.trim()) return;
    await apiPost("/items", { name: newName.trim(), storage_area: area, par: newPar || 0 });
    setNewName(""); setNewPar(0);
    load();
  };

  return (
    <div className="card">
      <h3>Counts — {area}</h3>
      <div className="row">
        <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
        <button className="btn" onClick={save}>Save Count</button>
      </div>

      <div className="row">
        <input placeholder="Add new item here" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input placeholder="PAR (optional)" type="number" value={newPar} onChange={(e) => setNewPar(parseFloat(e.target.value || "0"))} />
        <div></div><button className="btn" onClick={quickAdd}>Add Item Here</button>
      </div>

      {items.map((i) => (
        <div key={i.id} className="row">
          <div>{i.name}</div>
          <input
            type="number"
            value={lines[i.id] ?? ""}
            onChange={(e) => setLines((prev) => ({ ...prev, [i.id]: parseFloat(e.target.value || "0") }))}
          />
        </div>
      ))}
      <div className="muted">{items.length} item(s) in this area</div>
    </div>
  );
}

function AutoPO() {
  const [area, setArea] = useState(AREAS[0]);
  const [rows, setRows] = useState<any[]>([]);
  const run = async () => {
    const data = await apiGet<{ lines: any[] }>(`/auto-po?storage_area=${encodeURIComponent(area)}`);
    setRows(data.lines || []);
  };
  useEffect(() => { run(); }, [area]);

  return (
    <div className="card">
      <h3>Auto-PO</h3>
      <div className="row">
        <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
        <button className="btn" onClick={run}>Refresh</button>
      </div>
      <table>
        <thead><tr><th>Item</th><th>Area</th><th>On Hand</th><th>PAR</th><th>Suggested</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}><td>{r.name}</td><td>{r.storage_area || "-"}</td><td>{r.on_hand}</td><td>{r.par}</td><td>{r.suggested_order_qty}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/** ========================
 *  App
 *  =======================*/
export default function App() {
  const [tab, setTab] = useState<"counts" | "items" | "auto" | "settings" | "ocr" | "login">("counts");
  const { user, setUser, loggedIn, hasRole, logout } = useAuth();

  // When base URL changes in Settings, soft reload some data by flipping state
  const [, force] = useState(0);
  const forceReload = () => force((x) => x + 1);

  // Decide which tabs are visible
  const tabs = useMemo(() => {
    const base = [
      { id: "counts", label: "Counts", show: true },
      { id: "items", label: "Items", show: loggedIn && hasRole("admin", "manager") },
      { id: "auto", label: "Auto-PO", show: true },
      { id: "ocr", label: "Scan Invoice", show: loggedIn && hasRole("admin", "manager") },
      { id: "settings", label: "Settings", show: true },
    ] as { id: any; label: string; show: boolean }[];
    if (!loggedIn) base.push({ id: "login", label: "Login", show: true });
    return base.filter((t) => t.show);
  }, [loggedIn, hasRole]);

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Arial", margin: "16px" }}>
      <h1>TOS Inventory</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        {tabs.map((t) => (
          <button key={t.id} className={"tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          {loggedIn ? (
            <span className="muted">
              {user?.name || user?.email} ({user?.role}) ·{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); logout(); setTab("login"); }}>
                Logout
              </a>
            </span>
          ) : (
            <span className="muted">Not signed in</span>
          )}
        </div>
      </div>

      {/* Power-user card: CSV Import (only Admin/Manager) */}
      {loggedIn && hasRole("admin", "manager") && <Importer />}

      {tab === "login" && <LoginCard onLoggedIn={(u) => { setUser(u); setTab("counts"); }} />}
      {tab === "counts" && <Counts />}
      {tab === "items" && (loggedIn && hasRole("admin", "manager") ? <Items /> : <div className="card">No access.</div>)}
      {tab === "auto" && <AutoPO />}
      {tab === "settings" && <Settings onChanged={forceReload} />}
      {tab === "ocr" && (loggedIn && hasRole("admin", "manager") ? <InvoiceOCR /> : <div className="card">No access.</div>)}

      <style>{`
        .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .tab{padding:8px 12px;border:1px solid #000;border-radius:10px;background:#fff}
        .tab.active{background:#000;color:#fff}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
        .card.small{padding:10px}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0}
        input,select{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{padding:8px;border-top:1px solid #eee;text-align:left}
        .muted{color:#6b7280}
        a{color:inherit}
      `}</style>
    </div>
  );
}