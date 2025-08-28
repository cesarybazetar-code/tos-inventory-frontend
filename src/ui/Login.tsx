import React, { useState } from "react";

/** Helper to post x-www-form-urlencoded (FastAPI's OAuth2 form) */
async function postLogin(apiBase: string, email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const r = await fetch(apiBase.replace(/\/$/, "") + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function Login({
  onLogin,
}: {
  onLogin: (token: string, user: { email: string; role: string; name?: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const apiBase =
    localStorage.getItem("VITE_API_BASE_URL") ||
    ((import.meta as any).env?.VITE_API_BASE_URL || "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await postLogin(apiBase, email.trim().toLowerCase(), pwd);
      // res: { access_token, token_type, user:{email,role,...} }
      localStorage.setItem("auth_token", res.access_token);
      localStorage.setItem("user_email", res.user.email);
      localStorage.setItem("user_role", res.user.role);
      onLogin(res.access_token, res.user);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    }
  };

  return (
    <div className="card">
      <h3>Login</h3>
      <form onSubmit={submit} className="row">
        <input
          placeholder="Email"
          type="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
      {err && <div style={{ color: "red" }}>{err}</div>}
      <div className="muted">
        Tip: create your first admin by calling <code>/auth/register</code> on the backend
        with your <code>x-admin-key</code>, then login here.
      </div>
    </div>
  );
}