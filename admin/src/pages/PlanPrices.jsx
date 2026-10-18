import { useEffect, useState } from "react";
import { api } from "../api.js";
import { rupees, Spinner, Alert } from "../ui.jsx";

/**
 * Monthly membership prices. A member can take any combination of meals, so
 * the price is a matrix: one row per combination, one column per mess.
 */
export default function PlanPrices() {
  const [settings, setSettings] = useState(null);
  const [combos, setCombos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    Promise.all([api.adminSettings(), fetch("/api/subscriptions/combos").then((r) => r.json())])
      .then(([s, c]) => {
        setSettings(s);
        setCombos(c.combos || []);
      })
      .catch((e) => setErr(e.message));
  }, []);

  function setPrice(messKey, comboKey, value) {
    setSettings((prev) => ({
      ...prev,
      messes: prev.messes.map((m) =>
        m.key === messKey
          ? { ...m, monthlyPlans: { ...(m.monthlyPlans || {}), [comboKey]: value === "" ? 0 : Number(value) } }
          : m
      )
    }));
  }

  async function save() {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      await api.saveSettings({ messes: settings.messes });
      setOk("Prices saved. The membership form now shows these amounts.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (err && !settings) return <Alert>{err}</Alert>;
  if (!settings) return <Spinner />;

  const messes = settings.messes || [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Membership prices</h1>
          <p className="sub">
            What each monthly combination costs at each mess. Members see these on the website.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save prices"}
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="alert alert-warn">
        These are placeholder figures. Replace every one with your real monthly price
        before you take memberships.
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Price per combination, per mess</h2>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Meals included</th>
                {messes.map((m) => (
                  <th key={m.key} className="num">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {combos.map((c) => (
                <tr key={c.key}>
                  <td>
                    <strong>{c.label}</strong>
                    <div className="small muted">{c.meals.join(" + ")}</div>
                  </td>
                  {messes.map((m) => {
                    const v = Number(m.monthlyPlans?.[c.key]) || 0;
                    return (
                      <td key={m.key} className="num">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          style={{ width: 120, textAlign: "right" }}
                          value={v || ""}
                          placeholder="0"
                          onChange={(e) => setPrice(m.key, c.key, e.target.value)}
                        />
                        {v > 0 && <div className="small muted">{rupees(v)}/month</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="card-text small" style={{ marginTop: 16, marginBottom: 0 }}>
          A combination left at 0 is not offered on the website. Members who try to book it
          are told to call.
        </p>
      </div>

      <div style={{ position: "sticky", bottom: 14, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ boxShadow: "var(--shadow-lg)" }}>
          {busy ? "Saving..." : "Save prices"}
        </button>
      </div>
    </>
  );
}