import React, { useState } from "react";

type NewUser = { email: string; password: string; name?: string; role: "admin" | "manager" | "viewer" };

async function createUser(payload: NewUser) {
  const base =
    localStorage.getItem("VITE_API_BASE_URL") ||
    ((import.meta as any).env?.VITE_API_BASE_URL || "");
  const token = localStorage.getItem("auth_token");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;

  const r = await fetch(base.replace(/\/$/, "") + "/auth/register", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}

export default function AdminUsers() {
  const [form, setForm] = useState<NewUser>({ email: "", password: "", name: "", role: "viewer" });
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      await createUser({ ...form, email: form.email.trim().toLowerCase() });
      setMsg("User created ✅");
      setForm({ email: "", password: "", name: "", role: "viewer" });
    } catch (e: any) {
      setMsg(e?.message || "Failed to create user");
    }
  };

  return (
    <div className="card">
      <h3>Admin · Add User</h3>
      <form onSubmit={submit} className="row">
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
        />
        <input
          placeholder="Name (optional)"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <select
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as any }))}
        >
          <option value="viewer">viewer</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
        <button className="btn" type="submit">
          Create user
        </button>
      </form>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
      <div className="muted">Only admins can access this screen.</div>
    </div>
  );
}