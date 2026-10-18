import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, STATUSES } from "../api.js";
import { rupees, formatDateTime, timeAgo, StatusBadge, TypeBadge, PaymentBadge, Spinner, Alert, Confirm, messLabel } from "../ui.jsx";

const NEXT = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
  cancelled: "pending"
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function load() {
    try {
      const o = await api.order(id);
      setOrder(o);
      setNote(o.statusNote || "");
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status) {
    setErr("");
    try {
      const updated = await api.setOrderStatus(id, status, note);
      setOrder(updated);
      setNote(updated.statusNote || "");
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err && !order) return <Alert>{err}</Alert>;
  if (!order) return <Spinner />;

  const next = NEXT[order.status];

  return (
    <>
      <div className="topbar">
        <div>
          <p className="sub" style={{ margin: 0 }}>
            <Link to="/orders" className="muted">
              &larr; Orders
            </Link>
          </p>
          <h1 className="order-ref" style={{ marginBottom: ".2em" }}>
            {order.ref}
          </h1>
          <div className="btn-row" style={{ marginTop: 6 }}>
            <TypeBadge type={order.type} />
            <StatusBadge status={order.status} />
            <PaymentBadge payment={order.payment} />
            <span className="pill">{messLabel(order.mess)}</span>
          </div>
        </div>

        <div className="topbar-actions">
          {next && (
            <button className="btn btn-primary" onClick={() => setStatus(next)}>
              Mark as {next}
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => api.downloadCsv({ status: order.status }).catch((e) => setErr(e.message))}
          >
            Export
          </button>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}

      <div className="detail-grid">
        <div>
          <div className="card">
            <h3>What they ordered</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Each</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i, n) => (
                  <tr key={n}>
                    <td>
                      {i.name}
                      {i.note && <div className="small muted">{i.note}</div>}
                    </td>
                    <td className="num">{i.qty}</td>
                    <td className="num">{rupees(i.price)}</td>
                    <td className="num">{rupees(i.price * i.qty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="right">
                    Subtotal
                  </td>
                  <td className="num">{rupees(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan="3" className="right">
                    Service
                  </td>
                  <td className="num">{rupees(order.serviceFee)}</td>
                </tr>
                <tr>
                  <td colSpan="3" className="right">
                    <strong>Total</strong>
                  </td>
                  <td className="num">
                    <strong>{rupees(order.total)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.notes && (
            <div className="card">
              <h3>Notes from the customer</h3>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {order.notes}
              </p>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h3>Status note</h3>
              <span className="small muted">Only the team sees this</span>
            </div>
            <textarea
              rows="2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Called customer, moving to 13:30 slot"
            />
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setStatus(order.status)}>
                Save note
              </button>
            </div>
          </div>

          <div className="card">
            <h3>History</h3>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {[...order.history].reverse().map((h, n) => (
                  <tr key={n}>
                    <td className="nowrap">{formatDateTime(h.at)}</td>
                    <td>
                      <StatusBadge status={h.status} />
                    </td>
                    <td className="small">{h.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card">
            <h3>Customer</h3>
            <p style={{ marginBottom: ".3em" }}>
              <strong>{order.customer.name}</strong>
            </p>
            <p className="mb-0">
              <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
              <br />
              {order.customer.email && (
                <>
                  <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                  <br />
                </>
              )}
              {order.customer.address && <span className="small">{order.customer.address}</span>}
            </p>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <a className="btn btn-ghost btn-sm" href={`tel:${order.customer.phone}`}>
                Call
              </a>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(order.ref);
                }}
              >
                Copy ref
              </button>
            </div>
          </div>

          <div className="card">
            <h3>Booking</h3>
            <table>
              <tbody>
                <tr>
                  <td className="muted">Type</td>
                  <td className="right">{order.type}</td>
                </tr>
                <tr>
                  <td className="muted">People</td>
                  <td className="right">{order.people}</td>
                </tr>
                {order.type === "mess" ? (
                  <tr>
                    <td className="muted">Pickup slot</td>
                    <td className="right">{order.slot}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="muted">Event date</td>
                      <td className="right">
                        {order.eventDate ? formatDateTime(order.eventDate) : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="muted">Event type</td>
                      <td className="right">{order.eventType || "-"}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="muted">Placed</td>
                  <td className="right">{timeAgo(order.createdAt)}</td>
                </tr>
                <tr>
                  <td className="muted">Source</td>
                  <td className="right">{order.source}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {order.payment.status !== "paid" && (
            <div className="card">
              <h3>Payment</h3>
              <p className="small muted">
                Mark paid once you have taken the money at the counter. Stripe will wire in
                here automatically once <code>paymentLive</code> is switched on in Settings.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={() => setStatus("confirmed")}>
                Mark accepted
              </button>
              <button
                className="btn btn-dark btn-sm"
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  try {
                    setOrder(await api.markPaid(order.id, order.payment.method));
                  } catch (e) {
                    setErr(e.message);
                  }
                }}
              >
                Mark paid
              </button>
            </div>
          )}

          <div className="card">
            <h3>Set status</h3>
            <div className="btn-row">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={"chip" + (order.status === s ? " on" : "")}
                  onClick={() => setStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Confirm
        open={confirmDelete}
        title="Delete this order?"
        message={`${order.ref} will be removed permanently. Use cancel instead if you only need to stop it.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await api.deleteOrder(order.id);
            navigate("/orders");
          } catch (e) {
            setErr(e.message);
            setConfirmDelete(false);
          }
        }}
      />
    </>
  );
}
