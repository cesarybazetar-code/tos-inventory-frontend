import React, { useEffect, useState } from "react";

const envBase = (import.meta as any).env?.VITE_API_BASE_URL || "";
const baseFromLS = () => localStorage.getItem("VITE_API_BASE_URL") || envBase || "";
const join = (b: string, p: string) => (b.endsWith("/") ? b.slice(0, -1) : b) + p;

type Item = {
  id: number;
  name: string;
  storage_area?: string | null;
  par: number;
  inv_unit_price: number;
  active: boolean;
};

type ItemIn = Omit<Item, "id">;

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(join(baseFromLS(), path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": localStorage.getItem("admin_key") || "",
      ...(init?.headers || {}),
    },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function ItemEditor() {
  const blank: ItemIn = { name: "", storage_area: "", par: 0, inv_unit_price: 0, active: true };
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<ItemIn>(blank);
  const [editing, setEditing] = useState<Item | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const data = await api<Item[]>("/items");
      setItems(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load items");
    }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      if (editing) {
        const updated = await api<Item>(`/items/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
        setEditing(null);
      } else {
        const created = await api<Item>("/items", { method: "POST", body: JSON.stringify(form) });
        setItems(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setForm(blank);
    } catch (e: any) {
      setErr(e.message || "Save failed");
    }
  };

  const onEdit = (it: Item) => {
    setEditing(it);
    setForm({
      name: it.name,
      storage_area: it.storage_area || "",
      par: it.par,
      inv_unit_price: it.inv_unit_price,
      active: it.active,
    });
  };

  const onDelete = async (it: Item) => {
    if (!confirm(`Delete "${it.name}"?`)) return;
    setErr("");
    try {
      await fetch(join(baseFromLS(), `/items/${it.id}`), {
        method: "DELETE",
        headers: { "x-admin-key": localStorage.getItem("admin_key") || "" },
      }).then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); });
      setItems(prev => prev.filter(x => x.id !== it.id));
      if (editing?.id === it.id) { setEditing(null); setForm(blank); }
    } catch (e: any) {
      setErr(e.message || "Delete failed");
    }
  };

  return (
    <div className="card">
      <h3>Catalog (Add / Edit / Delete)</h3>

      {err && <div style={{ color: "red", marginBottom: 8 }}>{err}</div>}

      <form onSubmit={onSubmit} className="row">
        <input
          placeholder="Name *"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Storage area"
          value={form.storage_area || ""}
          onChange={e => setForm({ ...form, storage_area: e.target.value })}
        />
        <input
          type="number" step="0.01"
          placeholder="Par"
          value={form.par}
          onChange={e => setForm({ ...form, par: parseFloat(e.target.value || "0") })}
        />
        <input
          type="number" step="0.01"
          placeholder="Unit price"
          value={form.inv_unit_price}
          onChange={e => setForm({ ...form, inv_unit_price: parseFloat(e.target.value || "0") })}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={e => setForm({ ...form, active: e.target.checked })}
          />
          Active
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit">
            {editing ? "Update Item" : "Add Item"}
          </button>
          {editing && (
            <button type="button" className="btn" onClick={() => { setEditing(null); setForm(blank); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th style={{ width: "35%" }}>Name</th>
            <th>Area</th>
            <th>Par</th>
            <th>Unit $</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td>{it.name}</td>
              <td>{it.storage_area || "-"}</td>
              <td>{it.par}</td>
              <td>{it.inv_unit_price}</td>
              <td>{it.active ? "Yes" : "No"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn" onClick={() => onEdit(it)}>Edit</button>{" "}
                <button className="btn" onClick={() => onDelete(it)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
        .row{display:grid;grid-template-columns:2fr 1fr 0.6fr 0.8fr 0.6fr auto;gap:12px;margin:12px 0;align-items:center}
        input{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
        .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{padding:8px;border-top:1px solid #eee;text-align:left}
      `}</style>
    </div>
  );
}