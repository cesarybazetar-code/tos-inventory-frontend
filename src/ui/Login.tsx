import React, { useState } from "react";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email,setEmail] = useState(localStorage.getItem("last_email") || "");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");

  const submit = async ()=>{
    try {
      const base = localStorage.getItem("VITE_API_BASE_URL") || "";
      const fd = new URLSearchParams();
      fd.append("username", email.trim().toLowerCase());
      fd.append("password", password);
      const r = await fetch(base + "/auth/login", {
        method:"POST",
        headers: { "Content-Type":"application/x-www-form-urlencoded" },
        body: fd.toString()
      });
      if(!r.ok){ throw new Error(await r.text() || "Invalid login"); }
      const data = await r.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("last_email", email.trim().toLowerCase());
      onLogin();
    } catch(e:any){
      setError(e.message || "Login failed");
    }
  };

  return (
    <div className="card" style={{maxWidth:480, margin:"40px auto"}}>
      <h3>Login</h3>
      <div className="row">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      {error && <div style={{color:"red"}}>{error}</div>}
      <div className="row">
        <button className="btn" onClick={submit}>Sign in</button>
      </div>
    </div>
  );
}