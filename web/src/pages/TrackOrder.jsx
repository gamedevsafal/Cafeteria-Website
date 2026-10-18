import { useState } from "react";
import { Link } from "react-router-dom";
import { api, rupees } from "../api.js";

const STEPS = ["pending", "confirmed", "preparing", "ready", "completed"];

const STEP_COPY = {
  pending: "Received. We have your order.",
  confirmed: "Confirmed. The kitchen has it.",
  preparing: "Being cooked right now.",
  ready: "Bagged and waiting at the counter.",
  completed: "Collected. Thank you."
};

export default function TrackOrder() {
  const [ref, setRef] = useState("");
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    setErr("");
    setOrder(null);
    setBusy(true);
    try {
      setOrder(await api.trackOrder(ref));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = order ? STEPS.indexOf(order.status) : -1;

  return (
    <>
      <section className="page-hero">
        <div className="container narrow">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Track order</span>
          </nav>
          <p className="eyebrow">Order status</p>
          <h1>Track your order</h1>
          <p className="lede">
            Enter the reference we sent you by SMS. It looks like{" "}
            <span className="mono">DC-260918-4K2T</span>.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          <form className="card" onSubmit={lookup}>
            <label className="field">
              <span>Order reference</span>
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                placeholder="DC-260918-4K2T"
                required
                autoComplete="off"
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy || !ref.trim()}>
              {busy ? "Looking..." : "Find my order"}
            </button>
          </form>

          {err && <p className="form-msg is-error" style={{ marginTop: 18 }}>{err}</p>}

          {order && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h2 className="mono" style={{ margin: 0 }}>{order.ref}</h2>
                <span className={"badge badge-" + order.status}>{order.status}</span>
              </div>

              {order.status === "cancelled" ? (
                <div className="alert alert-error" style={{ marginBottom: 0 }}>
                  This order was cancelled. Please call us if that is not what you expected.
                </div>
              ) : (
                <ol className="steps">
                  {STEPS.map((s, i) => (
                    <li key={s} className={i <= stepIndex ? "done" : ""}>
                      <span className="step-dot" />
                      <strong>{s}</strong>
                      <span>{STEP_COPY[s]}</span>
                    </li>
                  ))}
                </ol>
              )}

              <table className="hours" style={{ marginTop: 20 }}>
                <tbody>
                  <tr>
                    <th scope="row">Type</th>
                    <td>{order.type}</td>
                  </tr>
                  {order.slot && (
                    <tr>
                      <th scope="row">Pickup</th>
                      <td>{order.slot}</td>
                    </tr>
                  )}
                  <tr>
                    <th scope="row">Placed</th>
                    <td>{new Date(order.createdAt).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <th scope="row">Total</th>
                    <td>{rupees(order.total)}</td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ marginTop: 22 }}>Items</h3>
              <div className="order-items">
                {order.items.map((i, n) => (
                  <div key={n}>
                    <span className="qty">{i.qty}x</span> {i.name}{" "}
                    <span className="muted">{rupees(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
