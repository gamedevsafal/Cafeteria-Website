import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../store.jsx";
import { api, rupees, MESSES } from "../api.js";
import { Loading } from "../components/DishCard.jsx";

const MEAL_META = {
  breakfast: { icon: "sun", window: "Served 7:00 - 10:30" },
  lunch: { icon: "plate", window: "Served 11:00 - 4:00" },
  dinner: { icon: "moon", window: "Served 7:00 - 10:30 pm" }
};

function Icon({ name }) {
  const p = {
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    plate: <><path d="M4 11h16a8 8 0 0 1-16 0Z" /><path d="M7 11c0-3 1-5 2-5s2 2 2 5" /><path d="M13 11c0-3 1-5 2-5s2 2 2 5" /></>,
    moon: <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z" />
  }[name];
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      {p}
    </svg>
  );
}

const money = rupees;

export default function Order() {
  const { settings } = useData();

  const [meals, setMeals] = useState(null);
  const [meal, setMeal] = useState("");
  const [qty, setQty] = useState(1);
  const [fulfilment, setFulfilment] = useState("pickup");
  const [pickMess, setPickMess] = useState(MESSES[0].key);
  const [form, setForm] = useState({ name: "", phone: "", slot: "", address: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  const deliveryOn = !!settings?.deliveryEnabled;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.meals();
        if (!alive) return;
        setMeals(data);
        const open = data.meals.find((m) => m.orderable);
        if (open) setMeal(open.meal);
      } catch (e) {
        if (alive) setErr(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const chosen = meals?.meals.find((m) => m.meal === meal);
  const unit = chosen?.price || 0;
  const subtotal = unit * qty;

  const minOrder = Number(settings?.deliveryMinOrder) || 0;
  const freeOver = Number(settings?.freeDeliveryOver) || 0;
  const isDelivery = fulfilment === "delivery";
  const qualifiesFree = isDelivery && subtotal >= freeOver;
  const deliveryFee = isDelivery ? (qualifiesFree ? 0 : Number(settings?.deliveryFee) || 0) : 0;
  const total = subtotal + deliveryFee;

  const maxThali = Number(settings?.maxMealQtyPerOrder) || 20;
  const meetsMin = !isDelivery || subtotal >= minOrder;
  /* Pickup times sit inside the service window, not the order window. */
  const slots = [];
  if (chosen && !isDelivery) {
    const [fh, fm] = String(chosen.servesFrom || "11:00").split(":").map(Number);
    const [th, tm] = String(chosen.servesTill || "16:00").split(":").map(Number);
    const from = fh * 60 + fm;
    const till = th * 60 + tm;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const lead = Number(settings?.messOrderLeadMinutes) || 0;
    const first = Math.max(from, Math.ceil((nowMins + lead) / 30) * 30);
    for (let t = first; t <= till; t += 30) {
      slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    }
  }

  const ready = !!chosen && chosen.orderable && (isDelivery ? form.address.trim().length >= 12 : slots.length > 0) && meetsMin;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setDone(null);

    if (!chosen) return setErr("Choose a meal first.");
    if (!chosen.orderable) return setErr(chosen.closedReason || `${chosen.label} orders are closed for today.`);
    if (isDelivery && form.address.trim().length < 12) return setErr("Please give the full delivery address.");
    if (!isDelivery && !slots.length) return setErr("No pickup times left today. Please call the mess.");

    setBusy(true);
    try {
      const res = await api.createOrder({
        type: "mess",
        meal,
        qty,
        fulfilment: isDelivery ? "delivery" : "pickup",
        deliveryAddress: isDelivery ? form.address.trim() : "",
        mess: pickMess,
        name: form.name.trim(),
        phone: form.phone.trim(),
        slot: isDelivery ? "" : form.slot,
        notes: form.notes.trim(),
        people: qty
      });
      setDone({ message: res.message, ref: res.order.ref });
      setForm({ name: "", phone: "", slot: "", address: "", notes: "" });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  if (!meals && !err) return <div className="container"><Loading label="Checking what we can cook for you" /></div>;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Order</span>
          </nav>
          <p className="eyebrow">{meals?.dayName} &middot; today&rsquo;s thali</p>
          <h1>Order lunch or dinner</h1>
          <p className="lede">
            One thali per person: dal, sabji, roti with ghee and rice. Collect from either
            mess, or we deliver inside {settings?.deliveryAreas || "Gwalior"}.
          </p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container order-layout">
          <div>
            <p className="eyebrow">Step one</p>
            <h2>Choose your meal</h2>
            <p className="card-text">
              Only the meals we can actually cook right now are shown as available.
            </p>

            <div className="meal-picker">
              {(meals?.meals || []).map((m) => {
                const meta = MEAL_META[m.meal];
                const on = meal === m.meal;
                return (
                  <button
                    key={m.meal}
                    type="button"
                    className={"meal-option" + (on ? " on" : "") + (m.orderable ? "" : " is-off")}
                    onClick={() => m.orderable && setMeal(m.meal)}
                    disabled={!m.orderable}
                    aria-pressed={on}
                  >
                    <span className="meal-icon"><Icon name={meta.icon} /></span>
                    <span className="meal-text">
                      <strong>{m.label}</strong>
                      {m.dishes ? <span>{m.dishes}</span> : <span>Not served today</span>}
                      <small>
                        {m.closedByDay
                          ? "Closed on " + (meals.dayName + "s")
                          : m.orderable
                            ? `Order ${m.orderOpens} - ${m.orderCutoff}`
                            : `Ordering ${m.orderOpens} - ${m.orderCutoff}`}
                      </small>
                    </span>
                    <span className="meal-price">{m.price ? money(m.price) : "—"}</span>
                  </button>
                );
              })}
            </div>

            {meals?.closed && (
              <div className="alert alert-warn" style={{ marginTop: 18 }}>
                We are closed today. Please call us if you need food arranged.
              </div>
            )}

            <div className="card" style={{ marginTop: 24 }}>
              <p className="eyebrow">How the mess works</p>
              <ul className="check-list" style={{ marginTop: ".25rem" }}>
                <li>Lunch is always one dal, one dry sabji, roti with ghee and rice</li>
                <li>Dinner is always one sabji, one dry sabji, roti with ghee and rice</li>
                <li>Sunday lunch is a special feast, rotating through five options</li>
                <li>Closed for dinner on Sundays</li>
                <li>Lunch orders close at 10:30, dinner orders at 19:30</li>
                <li>Members can book a monthly slot instead</li>
              </ul>
              <p style={{ margin: "1.25rem 0 0" }}>
                <Link className="btn btn-ghost btn-sm" to="/membership">Book a monthly slot</Link>
              </p>
            </div>
          </div>

          <form className="order-form" onSubmit={submit} noValidate>
            <h3 className="form-title">Your order</h3>

            {chosen && (
              <div className="cart-row" style={{ marginBottom: 12 }}>
                <div className="cart-name">
                  <span>{chosen.label} thali</span>
                  <small>{chosen.dishes}</small>
                </div>
                <div className="cart-qty">
                  <button className="qty-btn" type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">
                    &minus;
                  </button>
                  <output>{qty}</output>
                  <button className="qty-btn" type="button" onClick={() => setQty((q) => Math.min(maxThali, q + 1))} aria-label="One more">
                    +
                  </button>
                </div>
                <span className="cart-price">{money(subtotal)}</span>
              </div>
            )}

            {chosen && (
              <div className="cart-summary">
                <div className="line">
                  <span>{chosen.label} thali &times; {qty}</span>
                  <span>{money(subtotal)}</span>
                </div>
                {isDelivery && (
                  <div className="line">
                    <span>Delivery</span>
                    <span>{qualifiesFree ? "Free" : money(deliveryFee)}</span>
                  </div>
                )}
                <div className="line grand">
                  <span>Pay {isDelivery ? "on delivery" : "at the mess"}</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            )}

            <div className="choice">
              <label className={"choice-box" + (!isDelivery ? " on" : "")}>
                <input type="radio" name="fulfilment" checked={!isDelivery} onChange={() => setFulfilment("pickup")} />
                <span>
                  <strong>Collect from the mess</strong>
                  <small>Pick a time, pick a mess, pay there</small>
                </span>
              </label>
              {deliveryOn && (
                <label className={"choice-box" + (isDelivery ? " on" : "")}>
                  <input type="radio" name="fulfilment" checked={isDelivery} onChange={() => setFulfilment("delivery")} />
                  <span>
                    <strong>Home delivery</strong>
                    <small>Inside {settings?.deliveryAreas || "Gwalior"} &middot; {money(settings?.deliveryFee)}, free over {money(freeOver)}</small>
                  </span>
                </label>
              )}
            </div>

            {!isDelivery && (
              <>
                <div className="field">
                  <span className="field-label">Collect from</span>
                  <div className="chips">
                    {MESSES.map((m) => (
                      <button key={m.key} type="button" className={"chip" + (pickMess === m.key ? " on" : "")} onClick={() => setPickMess(m.key)}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span>Pickup time</span>
                  <select value={form.slot} onChange={(e) => set("slot", e.target.value)} required>
                    <option value="">{slots.length ? "Choose a pickup time" : "No times left today"}</option>
                    {slots.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {isDelivery && (
              <label className="field">
                <span>Delivery address in Gwalior</span>
                <textarea rows="3" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House / flat, street, area, Gwalior" />
                <em className="field-hint">Minimum {money(minOrder)} &middot; free over {money(freeOver)}</em>
              </label>
            )}

            <label className="field">
              <span>Name</span>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </label>

            <label className="field">
              <span>Mobile</span>
              <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="98XXXXXXXX" />
            </label>

            <label className="field">
              <span>Notes <em>optional</em></span>
              <textarea rows="2" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Jain please, less spicy..." />
            </label>

            {isDelivery && !meetsMin && chosen && (
              <p className="form-msg is-info">
                Add {money(minOrder - subtotal)} more to reach the {money(minOrder)} delivery minimum.
              </p>
            )}
            {err && <p className="form-msg is-error">{err}</p>}
            {done && (
              <p className="form-msg is-ok">
                {done.message} <Link to="/track">Track it</Link> with reference <strong>{done.ref}</strong>.
              </p>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={busy || !ready}>
              {busy ? "Sending..." : isDelivery ? "Order for delivery" : "Send order request"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}