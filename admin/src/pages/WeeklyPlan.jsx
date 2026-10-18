import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { rupees, Spinner, Alert } from "../ui.jsx";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Free-text input that also suggests from a known pool. */
function Suggest({ value, onChange, pool, placeholder, tone }) {
  const [focus, setFocus] = useState(false);
  return (
    <div className="suggest">
      <input
        type="text"
        value={value?.name || ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ name: e.target.value, price: value?.price || 0 })}
        onFocus={() => setFocus(true)}
        onBlur={() => window.setTimeout(() => setFocus(false), 150)}
        className={tone ? `tint-${tone}` : ""}
      />
      {focus && pool?.length > 0 && (
        <div className="suggest-list">
          {pool.map((p) => (
            <button type="button" key={p} onMouseDown={(e) => e.preventDefault()} onClick={() => onChange({ name: p, price: value?.price || 0 })}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WeeklyPlan() {
  const [week, setWeek] = useState(null);
  const [today, setToday] = useState(null);
  const [isOverride, setIsOverride] = useState(false);
  const [options, setOptions] = useState({ dal: [], sabzi: [], drySabji: [] });
  const [tab, setTab] = useState("today");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const [w, t, o] = await Promise.all([
        api.adminWeek(),
        api.todayMenu(),
        api.menuOptions()
      ]);
      setWeek(w);
      setToday(t.menu);
      setIsOverride(t.isOverride);
      setOptions(o);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patchWeek(day, patch) {
    setWeek((w) => w.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  }

  function patchToday(patch) {
    setToday((t) => ({ ...t, ...patch }));
  }

  async function saveWeek() {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const w = await api.saveWeek(week);
      setWeek(w);
      setMsg("Weekly plan saved. The website shows the new thali straight away.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveToday() {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await api.saveToday(today);
      setIsOverride(true);
      setMsg("Today's menu saved. It overrides the weekly plan until you clear it.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearToday() {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await api.resetToday();
      const t = await api.todayMenu();
      setToday(t.menu);
      setIsOverride(false);
      setMsg("Today's override removed. Back to the weekly plan.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (err && !week) return <Alert>{err}</Alert>;
  if (!week || !today) return <Spinner />;

  const todayDow = new Date().getDay();
  const prices = [
    { key: "priceBreakfast", label: "Breakfast price" },
    { key: "priceLunch", label: "Lunch thali price" },
    { key: "priceDinner", label: "Dinner thali price" }
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mess menu plan</h1>
          <p className="sub">
            Every day is a thali: one dal, one sabji, roti with ghee and rice. Choose what
            is cooking and it appears on the website.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={tab === "today" ? saveToday : saveWeek} disabled={busy}>
            {busy ? "Saving..." : tab === "today" ? "Save today's menu" : "Save weekly plan"}
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}
      {msg && <Alert kind="ok">{msg}</Alert>}

      <div className="toolbar">
        <button className={"chip" + (tab === "today" ? " on" : "")} onClick={() => setTab("today")}>
          Today&rsquo;s menu
        </button>
        <button className={"chip" + (tab === "week" ? " on" : "")} onClick={() => setTab("week")}>
          Weekly plan
        </button>
        {isOverride && tab === "today" && (
          <button className="chip" onClick={clearToday} disabled={busy}>
            Reset to weekly plan
          </button>
        )}
      </div>

      {tab === "today" ? (
        <>
          <div className="alert alert-info">
            {isOverride
              ? "Today has its own menu, overriding the weekly plan."
              : `Today is following the weekly plan for ${DAYS[todayDow]}. Saving here makes today special.`}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>{DAYS[todayDow]} &middot; today&rsquo;s thali</h2>
            </div>

            <div className="row row-3">
              <div className="field">
                <label>Breakfast</label>
                <Suggest value={today.breakfast} pool={["Poha", "Aloo Paratha with Curd/Butter", "Puri Sabji", "Sandwich / Bread Butter Jam", "Upma", "Sada Paratha with Curd/Butter", "Maggi (Cozy Cravings)"]} onChange={(v) => patchToday({ breakfast: v })} placeholder="Poha" />
              </div>
              <div className="field">
                <label>Lunch dal</label>
                <Suggest value={today.lunchDal} pool={options.dal} onChange={(v) => patchToday({ lunchDal: v })} placeholder="Arhar Dal" />
              </div>
              <div className="field">
                <label>Lunch dry sabzi</label>
                <Suggest value={today.lunchDrySabji} pool={options.drySabji} onChange={(v) => patchToday({ lunchDrySabji: v })} placeholder="Aloo Methi" />
              </div>
            </div>

            <div className="row row-3">
              <div className="field">
                <label>Lunch special <em>Sunday</em></label>
                <Suggest value={today.lunchSabji} pool={["Sunday Special Feast", "Paneer ki Sabji", "Chole ki Sabji", "Rajma Chawal", "Veg Biryani", "Soya Chaap"]} onChange={(v) => patchToday({ lunchSabji: v })} placeholder="Optional" />
              </div>
              <div className="field">
                <label>Dinner sabji</label>
                <Suggest value={today.dinnerSabji} pool={options.sabzi} onChange={(v) => patchToday({ dinnerSabji: v })} placeholder="Gatte ki Sabji" />
              </div>
              <div className="field">
                <label>Dinner dry sabzi</label>
                <Suggest value={today.dinnerDrySabji} pool={options.drySabji} onChange={(v) => patchToday({ dinnerDrySabji: v })} placeholder="Mix Veg" />
              </div>
            </div>

            <div className="row row-3">
              {prices.map((p) => (
                <div className="field" key={p.key}>
                  <label>{p.label}</label>
                  <input type="number" min="0" value={today[p.key] ?? 0} onChange={(e) => patchToday({ [p.key]: Number(e.target.value) })} />
                </div>
              ))}
            </div>

            <div className="switch-row">
              <div className="txt"><strong>Roti with ghee</strong><span>Served with every meal</span></div>
              <button className={"switch" + (today.ghee !== false ? " on" : "")} onClick={() => patchToday({ ghee: today.ghee === false })} aria-label="Roti with ghee" />
            </div>
            <div className="switch-row">
              <div className="txt"><strong>Rice</strong><span>Included with lunch and dinner</span></div>
              <button className={"switch" + (today.rice !== false ? " on" : "")} onClick={() => patchToday({ rice: today.rice === false })} aria-label="Rice" />
            </div>
            <div className="switch-row">
              <div className="txt"><strong>No breakfast today</strong><span>Sundays and holidays</span></div>
              <button className={"switch" + (today.breakfastClosed ? " on" : "")} onClick={() => patchToday({ breakfastClosed: !today.breakfastClosed })} aria-label="No breakfast today" />
            </div>
            <div className="switch-row">
              <div className="txt"><strong>No dinner tonight</strong><span>We are closed for dinner on Sundays</span></div>
              <button className={"switch" + (today.dinnerClosed ? " on" : "")} onClick={() => patchToday({ dinnerClosed: !today.dinnerClosed })} aria-label="No dinner today" />
            </div>
            <div className="switch-row">
              <div className="txt"><strong>Closed today</strong><span>Hides the thali from the website</span></div>
              <button className={"switch" + (today.closed ? " on" : "")} onClick={() => patchToday({ closed: !today.closed })} aria-label="Closed today" />
            </div>

            <div className="field">
              <label>Note for today</label>
              <input value={today.note || ""} onChange={(e) => patchToday({ note: e.target.value })} placeholder="Sunday feast today, limited kheer..." />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="alert alert-info">
            This is the repeating plan. Change a day once and it rolls over every week
            until you change it again.
          </div>

          {week
            .slice()
            .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
            .map((d) => (
              <div className="card" key={d.day}>
                <div className="card-head">
                  <h2>{DAYS[d.day]}</h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["priceBreakfast", "priceLunch", "priceDinner"].map((k, i) => (
                      <input
                        key={k}
                        type="number"
                        min="0"
                        style={{ width: 90 }}
                        title={["Breakfast", "Lunch", "Dinner"][i]}
                        value={d[k] ?? 0}
                        onChange={(e) => patchWeek(d.day, { [k]: Number(e.target.value) })}
                      />
                    ))}
                  </div>
                </div>

                <div className="row row-3">
                  <div className="field">
                    <label>Breakfast</label>
                    <Suggest value={d.breakfast} pool={["Poha", "Aloo Paratha with Curd/Butter", "Puri Sabji", "Sandwich / Bread Butter Jam", "Upma", "Sada Paratha with Curd/Butter", "Maggi"]} onChange={(v) => patchWeek(d.day, { breakfast: v })} />
                  </div>
                  <div className="field">
                    <label>Lunch dal</label>
                    <Suggest value={d.lunchDal} pool={options.dal} onChange={(v) => patchWeek(d.day, { lunchDal: v })} />
                  </div>
                  <div className="field">
                    <label>Lunch dry sabzi</label>
                    <Suggest value={d.lunchDrySabji} pool={options.drySabzi} onChange={(v) => patchWeek(d.day, { lunchDrySabji: v })} />
                  </div>
                </div>

                <div className="row row-3">
                  <div className="field">
                    <label>Lunch special <em>Sunday</em></label>
                    <Suggest value={d.lunchSabji} pool={["Sunday Special Feast", "Paneer ki Sabji", "Chole ki Sabji", "Rajma Chawal", "Veg Biryani", "Soya Chaap"]} onChange={(v) => patchWeek(d.day, { lunchSabji: v })} placeholder="Optional" />
                  </div>
                  <div className="field">
                    <label>Dinner sabji</label>
                    <Suggest value={d.dinnerSabji} pool={options.sabzi} onChange={(v) => patchWeek(d.day, { dinnerSabji: v })} />
                  </div>
                  <div className="field">
                    <label>Dinner dry sabzi</label>
                    <Suggest value={d.dinnerDrySabji} pool={options.drySabji} onChange={(v) => patchWeek(d.day, { dinnerDrySabji: v })} />
                  </div>
                </div>
              </div>
            ))}

          <div style={{ position: "sticky", bottom: 14, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={saveWeek} disabled={busy} style={{ boxShadow: "var(--shadow-lg)" }}>
              {busy ? "Saving..." : "Save weekly plan"}
            </button>
          </div>
        </>
      )}
    </>
  );
}