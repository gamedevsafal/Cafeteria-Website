import { useEffect, useState, useCallback } from "react";
import { api, MESSES } from "../api.js";
import { rupees, formatDateTime, timeAgo, Spinner, Empty, Alert, Confirm } from "../ui.jsx";

const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const mealText = (meals) =>
  (meals || []).map((m) => MEAL_LABELS[m] || m).join(" + ") || "-";

const STATUSES = ["pending", "active", "paused", "cancelled", "expired"];

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("all");
  const [mess, setMess] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [s, res] = await Promise.all([
        api.adminSubs({ status, mess, search }),
        api.subStats()
      ]);
      setSubs(s.subscriptions);
      setStats(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, mess, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(sub, body) {
    try {
      const updated = await api.updateSub(sub.id, body);
      setSubs((l) => l.map((s) => (s.id === updated.id ? updated : s)));
      setEditing(null);
      api.subStats().then(setStats).catch(() => {});
    } catch (e) {
      setErr(e.message);
    }
  }

  function download() {
    api.downloadSubsCsv({ status }).catch((e) => setErr(e.message));
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mess memberships</h1>
          <p className="sub">Monthly slots booked from the website. {subs.length} shown.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <button className="btn btn-dark" onClick={download}>Export CSV</button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}

      {stats && (
        <div className="stat-grid">
          <div className="stat green">
            <span className="label">Active members</span>
            <span className="value">{stats.activeCount}</span>
            <p className="hint">Currently paying</p>
          </div>
          <div className="stat accent">
            <span className="label">Monthly recurring</span>
            <span className="value">{rupees(stats.monthlyRecurring)}</span>
            <p className="hint">From active memberships</p>
          </div>
          <div className="stat">
            <span className="label">Awaiting approval</span>
            <span className="value">{stats.byStatus.pending || 0}</span>
            <p className="hint">New bookings</p>
          </div>
          {MESSES.filter((m) => m.key !== "all").map((m) => (
            <div className="stat" key={m.key}>
              <span className="label">{m.label}</span>
              <span className="value">{stats.byMess[m.key] || 0}</span>
              <p className="hint">Active + pending</p>
            </div>
          ))}
        </div>
      )}

      <div className="toolbar">
        {["all", ...STATUSES].map((s) => (
          <button key={s} className={"chip" + (status === s ? " on" : "")} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <input
          className="chip-search"
          type="text"
          placeholder="Search ref, name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={mess} onChange={(e) => setMess(e.target.value)} style={{ width: "auto" }}>
          <option value="all">Both messes</option>
          {MESSES.filter((m) => m.key !== "all").map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : subs.length === 0 ? (
        <div className="card">
          <Empty title="No memberships here">
            Bookings made from the website&rsquo;s mess membership form land on this page.
          </Empty>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Member</th>
                  <th>Mess</th>
                  <th>Plan</th>
                  <th className="num">Meals/wk</th>
                  <th className="num">Monthly</th>
                  <th>Paid this month</th>
                  <th>Status</th>
                  <th>Booked</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} style={{ opacity: s.status === "cancelled" ? 0.55 : 1 }}>
                    <td className="order-ref nowrap">{s.ref}</td>
                    <td>
                      <strong>{s.name}</strong>
                      <br />
                      <a className="small" href={`tel:${s.phone}`}>{s.phone}</a>
                    </td>
                    <td className="nowrap">{MESSES.find((m) => m.key === s.mess)?.label || s.mess}</td>
                    <td className="nowrap">{mealText(s.meals)}</td>
                    <td className="num">{s.mealsPerWeek}</td>
                    <td className="num">{rupees(s.monthlyAmount)}</td>
                    <td>
                      <button
                        className={"switch" + (s.paidThisMonth ? " on" : "")}
                        onClick={() => patch(s, { markPaid: !s.paidThisMonth })}
                        title={s.paidThisMonth ? "Paid this month" : "Mark as paid"}
                        aria-label="Toggle paid"
                      />
                    </td>
                    <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                    <td className="nowrap small" title={formatDateTime(s.createdAt)}>{timeAgo(s.createdAt)}</td>
                    <td className="right nowrap">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(s)}>Edit</button>{" "}
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(s)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editing.name}</h2>
              <button className="x-btn" onClick={() => setEditing(null)} aria-label="Close">&times;</button>
            </div>
            <div className="modal-body">
              <p className="small muted mono">{editing.ref}</p>

              <div className="row row-2">
                <div className="field">
                  <label>Status</label>
                  <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Mess</label>
                  <select value={editing.mess} onChange={(e) => setEditing({ ...editing, mess: e.target.value })}>
                    {MESSES.filter((m) => m.key !== "all").map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row row-3">
                <div className="field">
                  <label>Plan</label>
                  <select value={editing.mess} onChange={(e) => setEditing({ ...editing, mess: e.target.value })}>
                    {MESSES.filter((m) => m.key !== "all").map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Meals per week</label>
                  <input
                    type="number" min="1" max="7"
                    value={editing.mealsPerWeek}
                    onChange={(e) => setEditing({ ...editing, mealsPerWeek: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Monthly ₹</label>
                  <input
                    type="number" min="0"
                    value={editing.monthlyAmount}
                    onChange={(e) => setEditing({ ...editing, monthlyAmount: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label>Start date</label>
                <input
                  type="date"
                  value={editing.startDate ? new Date(editing.startDate).toISOString().slice(0, 10) : ""}
                  onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Internal note</label>
                <textarea
                  rows="2"
                  value={editing.internalNote || ""}
                  onChange={(e) => setEditing({ ...editing, internalNote: e.target.value })}
                  placeholder="Agreed price, dietary notes, anything only the team should see"
                />
              </div>

              {editing.notes && (
                <p className="small muted">From the customer: &ldquo;{editing.notes}&rdquo;</p>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() =>
                  patch(editing, {
                    status: editing.status,
                    mess: editing.mess,
                    meals: editing.meals,
                    mealsPerWeek: Number(editing.mealsPerWeek),
                    monthlyAmount: Number(editing.monthlyAmount),
                    startDate: editing.startDate || null,
                    internalNote: editing.internalNote || ""
                  })
                }
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <Confirm
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.name}'s membership?`}
        message="This removes the record permanently. If they have simply stopped coming, cancel it instead."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          try {
            await api.deleteSub(confirmDelete.id);
            setSubs((l) => l.filter((s) => s.id !== confirmDelete.id));
          } catch (e) {
            setErr(e.message);
          }
          setConfirmDelete(null);
        }}
      />
    </>
  );
}