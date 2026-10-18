import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { Spinner, Alert } from "../ui.jsx";

const MEALS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" }
];

function TimeInput({ value, onChange, label }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="time" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function MealTimes() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api.adminSettings()
      .then((d) => setS({ ...d, mealWindows: d.mealWindows || {} }))
      .catch((e) => setErr(e.message));
  }, []);

  const save = useCallback(async () => {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      await api.saveSettings({ mealWindows: s.mealWindows });
      setOk("Saved. The order page now only offers meals inside these windows.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [s]);

  if (err && !s) return <Alert>{err}</Alert>;
  if (!s) return <Spinner />;

  const setWin = (meal, key, value) =>
    setS((prev) => ({
      ...prev,
      mealWindows: {
        ...prev.mealWindows,
        [meal]: { ...(prev.mealWindows[meal] || {}), [key]: value }
      }
    }));

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Meal times</h1>
          <p className="sub">
            When each meal is served, and the window in which people can order it.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save times"}
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="alert alert-info">
        Ordering always happens <strong>before</strong> the meal is served. Set the serving
        times to when people come to eat, then leave enough room for the order window to
        close before service starts.
      </div>

      {MEALS.map((meal) => {
        const w = s.mealWindows[meal.id] || {};
        return (
          <div className="card" key={meal.id}>
            <div className="card-head">
              <h2>{meal.label}</h2>
              <span className="pill">
                served {w.servesFrom || "-"} to {w.servesTill || "-"}
              </span>
            </div>

            <div className="row row-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <TimeInput label="Orders open" value={w.orderOpens} onChange={(v) => setWin(meal.id, "orderOpens", v)} />
              <TimeInput label="Orders close" value={w.orderCutoff} onChange={(v) => setWin(meal.id, "orderCutoff", v)} />
              <TimeInput label="Served from" value={w.servesFrom} onChange={(v) => setWin(meal.id, "servesFrom", v)} />
              <TimeInput label="Served till" value={w.servesTill} onChange={(v) => setWin(meal.id, "servesTill", v)} />
            </div>

            <p className="small muted" style={{ marginBottom: 0 }}>
              Outside {w.orderOpens} to {w.orderCutoff} this meal is hidden from the order
              page and the API rejects anyone trying to order it. Pickup slots offered to
              customers sit inside {w.servesFrom} to {w.servesTill}.
            </p>
          </div>
        );
      })}

      <div className="card">
        <h2>Delivery hours</h2>
        <p className="small muted">
          Delivery runs in its own window, separate from when the meals are served.
        </p>
        <div className="row row-2">
          <div className="field">
            <label>Delivery from</label>
            <input
              type="time"
              value={s.deliveryOpens || ""}
              onChange={(e) => setS({ ...s, deliveryOpens: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Delivery till</label>
            <input
              type="time"
              value={s.deliveryCloses || ""}
              onChange={(e) => setS({ ...s, deliveryCloses: e.target.value })}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save delivery hours"}
        </button>
      </div>
    </>
  );
}