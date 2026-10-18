import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, MESSES, STATUSES } from "../api.js";
import { rupees, timeAgo, formatDateTime, StatusBadge, TypeBadge, PaymentBadge, Spinner, Empty, Alert, messLabel } from "../ui.jsx";

const STATUS_DOTS = {
  pending: "var(--amber)",
  confirmed: "var(--blue)",
  preparing: "#8a5a0d",
  ready: "var(--green)",
  completed: "var(--ink-faint)",
  cancelled: "var(--red)"
};

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const status = params.get("status") || "all";
  const type = params.get("type") || "all";
  const mess = params.get("mess") || "all";
  const search = params.get("search") || "";

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (!v || v === "all") next.delete(k);
    else next.set(k, v);
    setParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.adminOrders({ status, type, mess, search, limit: 200 });
      setOrders(res.orders);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, type, mess, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(order) {
    const flow = ["pending", "confirmed", "preparing", "ready", "completed"];
    const i = flow.indexOf(order.status);
    if (i === -1 || i === flow.length - 1) return;
    try {
      await api.setOrderStatus(order.id, flow[i + 1]);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  const pendingTotal = orders.filter((o) => o.status === "pending").length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Orders</h1>
          <p className="sub">
            {orders.length} shown{pendingTotal > 0 ? ` · ${pendingTotal} new` : ""}
          </p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={load}>
            Refresh
          </button>
          <button
            className="btn btn-dark"
            onClick={() =>
              api.downloadCsv({ status, date: new Date().toISOString().slice(0, 10) }).catch((e) => setErr(e.message))
            }
          >
            Export CSV
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}

      <div className="toolbar">
        <button className={"chip" + (status === "all" ? " on" : "")} onClick={() => setParam("status", "all")}>
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} className={"chip" + (status === s ? " on" : "")} onClick={() => setParam("status", s)}>
            <span className="dot" style={{ background: STATUS_DOTS[s] }} />
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
          onChange={(e) => setParam("search", e.target.value)}
        />
        <select value={type} onChange={(e) => setParam("type", e.target.value)} style={{ width: "auto" }}>
          <option value="all">All types</option>
          <option value="mess">Mess</option>
          <option value="catering">Catering</option>
        </select>
        <select value={mess} onChange={(e) => setParam("mess", e.target.value)} style={{ width: "auto" }}>
          {MESSES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        {(status !== "all" || type !== "all" || mess !== "all" || search) && (
          <button className="chip" onClick={() => setParams(new URLSearchParams())}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <div className="card">
          <Empty title="Nothing here">
            {search ? "No order matches that search." : "No orders with this filter yet."}
          </Empty>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Type / Mess</th>
                  <th>When</th>
                  <th>What they want</th>
                  <th className="num">People</th>
                  <th className="num">Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/orders/${o.id}`} className="order-ref">
                        {o.ref}
                      </Link>
                      <br />
                      <span className="small muted">{timeAgo(o.createdAt)}</span>
                    </td>
                    <td>
                      <strong>{o.customer.name}</strong>
                      <br />
                      <a className="small" href={`tel:${o.customer.phone}`}>
                        {o.customer.phone}
                      </a>
                    </td>
                    <td>
                      <TypeBadge type={o.type} />
                      <br />
                      <span className="small muted">{messLabel(o.mess)}</span>
                    </td>
                    <td className="nowrap small">
                      {o.type === "catering" ? (
                        <>
                          {new Date(o.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          <br />
                          <span className="muted">{o.eventType}</span>
                        </>
                      ) : (
                        <>
                          {o.slot}
                          <br />
                          <span className="muted">{timeAgo(o.createdAt)}</span>
                        </>
                      )}
                    </td>
                    <td className="order-items">
                      {o.items.slice(0, 3).map((i, n) => (
                        <div key={n}>
                          <span className="qty">{i.qty}x</span> {i.name}
                        </div>
                      ))}
                      {o.items.length > 3 && <span className="muted">+{o.items.length - 3} more</span>}
                    </td>
                    <td className="num">{o.people}</td>
                    <td className="num">
                      <strong>{rupees(o.total)}</strong>
                    </td>
                    <td>
                      <PaymentBadge payment={o.payment} />
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="right nowrap">
                      {o.status !== "completed" && o.status !== "cancelled" && (
                        <button className="btn btn-ghost btn-sm" onClick={() => advance(o)}>
                          {o.status === "ready" ? "Complete" : o.status === "pending" ? "Accept" : "Next"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
