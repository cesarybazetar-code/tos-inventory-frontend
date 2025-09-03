import React, { useState } from "react";

const base = () =>
  localStorage.getItem("VITE_API_BASE_URL") ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "";

const token = () => localStorage.getItem("token") || "";

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
  const r = await fetch(base() + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}` },
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postJSON(path: string, body: any) {
  const r = await fetch(base() + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
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

  const upload = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const res: OCRResp = await postForm("/invoice/ocr", file);
      setLines(res.lines || []);
    } catch (e: any) {
      setError(e.message || "OCR failed");
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
    } catch (e: any) {
      alert(e.message || "Error saving OCR receipt");
    }
  };

  const update = (idx: number, field: "qty" | "unit_price", val: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l))
    );
  };

  return (
    <div className="card">
      <h3>Scan Invoice (Photo → Items)</h3>
      <div className="row">
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => e.target.files && upload(e.target.files[0])}
        />
        <input
          placeholder="Receiver name"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
      </div>
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
                      value={l.qty}
                      onChange={(e) =>
                        update(idx, "qty", parseFloat(e.target.value || "0"))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={l.unit_price}
                      onChange={(e) =>
                        update(
                          idx,
                          "unit_price",
                          parseFloat(e.target.value || "0")
                        )
                      }
                    />
                  </td>
                  <td className="muted">{l.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button className="btn" onClick={submit}>
              Save Receiving (OCR)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}