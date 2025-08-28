import React, { useState } from "react";

const envBase = (import.meta as any).env?.VITE_API_BASE_URL || "";
const baseFromLS = () => localStorage.getItem("VITE_API_BASE_URL") || envBase || "";
const join = (b: string, p: string) => (b.endsWith("/") ? b.slice(0, -1) : b) + p;

type OCRLine = {
  text: string;
  item_id: number;
  name: string;
  storage_area?: string;
  qty: number;
  unit_price: number;
};
type OCRResp = { lines: OCRLine[] };

async function postForm(path: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(join(baseFromLS(), path), {
    method: "POST",
    headers: { "x-admin-key": localStorage.getItem("admin_key") || "" },
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postJSON(path: string, body: any) {
  const r = await fetch(join(baseFromLS(), path), {
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

export default function InvoiceOCR() {
  const [lines, setLines] = useState<OCRLine[]>([]);
  const [receiver, setReceiver] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedName, setSelectedName] = useState("");

  const upload = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const res: OCRResp = await postForm("/invoice/ocr", file);
      setLines(res?.lines || []);
      if (!res?.lines?.length) setError("No lines detected. Try a clearer photo or screenshot.");
    } catch (e: any) {
      setError(e?.message || "OCR failed");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    try {
      await postJSON("/receive/ocr", {
        receiver,
        lines: lines.map((l) => ({
          item_id: l.item_id,
          qty: l.qty,
          unit_price: l.unit_price,
        })),
      });
      alert("Received via OCR saved.");
      setLines([]);
      setReceiver("");
      setSelectedName("");
    } catch (e: any) {
      alert(e?.message || "Error saving OCR receipt");
    }
  };

  const update = (idx: number, field: "qty" | "unit_price", val: number) => {
    const safe = Number.isFinite(val) ? val : 0;
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: safe } : l)));
  };

  return (
    <div className="card">
      <h3>Scan Invoice (Photo → Items)</h3>

      <div className="row">
        {/* Upload button that triggers the iOS/Android chooser:
           Take Photo / Choose from Library / Browse */}
        <label className="btn" style={{ textAlign: "center" }}>
          📸 Upload Invoice
          <input
            type="file"
            accept="image/*"               // <-- ensures the popup with Camera / Library / Files
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSelectedName(f.name || "photo");
              upload(f);
            }}
          />
        </label>

        <input
          placeholder="Receiver name"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
      </div>

      {!!selectedName && (
        <div className="muted" style={{ marginTop: 4 }}>
          Selected: {selectedName}
        </div>
      )}

      {loading && <div>Reading…</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      {lines.length > 0 && (
        <div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Area</th>
                <th>Qty</th>
                <th>Unit $</th>
                <th>Source Line</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td>{l.name}</td>
                  <td>{l.storage_area || "-"}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={l.qty}
                      onChange={(e) => update(idx, "qty", parseFloat(e.target.value || "0"))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={l.unit_price}
                      onChange={(e) =>
                        update(idx, "unit_price", parseFloat(e.target.value || "0"))
                      }
                    />
                  </td>
                  <td className="muted">{l.text}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row">
            <button className="btn" disabled={!receiver || lines.length === 0} onClick={submit}>
              Save Receiving (OCR)
            </button>
          </div>
        </div>
      )}

      <style>{`
        .btn{padding:8px 12px;border:1px solid #000;background:#000;color:#fff;border-radius:10px;cursor:pointer}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:10px 0}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0}
        input{padding:8px;border:1px solid #cbd5e1;border-radius:10px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{padding:8px;border-top:1px solid #eee;text-align:left}
        .muted{color:#6b7280;font-size:12px}
      `}</style>
    </div>
  );
}
