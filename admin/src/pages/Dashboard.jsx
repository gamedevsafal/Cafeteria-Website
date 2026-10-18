import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, MESSES } from "../api.js";
import { rupees, timeAgo, StatusBadge, TypeBadge, PaymentBadge, Spinner, Empty, Alert, messLabel } from "../ui.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, o, m] = await Promise.all([
          api.orderStats(),
          api.adminOrders({ limit: 8 }),
          api.adminMenu({ scope: "mess" })
        ]);
        if (!alive) return;
        setStats(s);
        setOrders(o.orders);
        setMenu(m);
      } catch (e) {
        if (alive) setErr(e.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (err) return <Alert>{err}</Alert>;
  if (!stats) return <Spinner />;

  const todayByMess = MESSES.filter((m) => m.key !== "all").map((m) => {
    const items = menu.filter((i) => i.mess === m.key);
    return {
      ...m,
      total: items.length,
      out: items.filter((i) => !i.available).length
    };
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">Today at a glance.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => api.downloadCsv({ status: "all" })}>
            Export today&rsquo;s orders
          </button>
          <Link className="btn btn-primary" to="/menu">
            Update today&rsquo;s menu
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="label">Orders today</span>
          <span className="value">{stats.today}</span>
          <p className="hint">Catering requests included</p>
        </div>
        <div className="stat accent">
          <span className="label">Revenue today</span>
          <span className="value">{rupees(stats.todayRevenue)}</span>
          <p className="hint">Cancelled orders excluded</p>
        </div>
        <div className="stat">
          <span className="label">Needs attention</span>
          <span className="value">{stats.byStatus.pending || 0}</span>
          <p className="hint">New, not yet confirmed</p>
        </div>
        <div className="stat green">
          <span className="label">Catering live</span>
          <span className="value">{stats.cateringOpen}</span>
          <p className="hint">Pending or confirmed</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Kitchen load</h2>
          <Link className="btn btn-ghost btn-sm" to="/orders">
            All orders
          </Link>
        </div>

        <div className="stat-grid" style={{ marginBottom: 0 }}>
          {["pending", "confirmed", "preparing", "ready", "completed", "cancelled"].map((s) => (
            <Link
              key={s}
              to={`/orders?status=${s}`}
              className="stat"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span className="label">{s}</span>
              <span className="value">{stats.byStatus[s] || 0}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Today&rsquo;s menu on the website</h2>
          <Link className="btn btn-ghost btn-sm" to="/menu">
            Edit
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mess</th>
                <th className="num">Items on the board</th>
                <th className="num">Marked sold out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayByMess.map((m) => (
                <tr key={m.key}>
                  <td>
                    <strong>{m.label}</strong>
                    <br />
                    <span className="small muted">{messLabel(m.key)}</span>
                  </td>
                  <td className="num">{m.total}</td>
                  <td className="num">{m.out}</td>
                  <td>
                    {m.out > 0 ? (
                      <span className="badge badge-ready">{m.out} hidden</span>
                    ) : m.total === 0 ? (
                      <span className="badge badge-cancelled">empty</span>
                    ) : (
                      <span className="badge badge-ready">all live</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Latest orders</h2>
          <Link className="btn btn-ghost btn-sm" to="/orders">
            See all
          </Link>
        </div>

        {orders.length === 0 ? (
          <Empty title="No orders yet">Orders placed on the website will appear here.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>When</th>
                  <th className="num">People</th>
                  <th className="num">Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/orders/${o.id}`} className="order-ref">
                        {o.ref}
                      </Link>
                    </td>
                    <td>
                      {o.customer.name}
                      <br />
                      <span className="small muted">{o.customer.phone}</span>
                    </td>
                    <td>
                      <TypeBadge type={o.type} />
                      <br />
                      <span className="small muted">{messLabel(o.mess)}</span>
                    </td>
                    <td className="nowrap small">
                      {o.type === "catering" ? o.eventDate : o.slot}
                      <br />
                      <span className="muted">{timeAgo(o.createdAt)}</span>
                    </td>
                    <td className="num">{o.people}</td>
                    <td className="num">{rupees(o.total)}</td>
                    <td>
                      <PaymentBadge payment={o.payment} />
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
