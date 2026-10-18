import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../store.jsx";
import { api, rupees, MESSES, mealSchedule } from "../api.js";

const ALL_COMBOS = [
  { key: "breakfast", label: "Breakfast only", meals: ["breakfast"] },
  { key: "lunch", label: "Lunch only", meals: ["lunch"] },
  { key: "dinner", label: "Dinner only", meals: ["dinner"] },
  { key: "breakfast+lunch", label: "Breakfast + Lunch", meals: ["breakfast", "lunch"] },
  { key: "breakfast+dinner", label: "Breakfast + Dinner", meals: ["breakfast", "dinner"] },
  { key: "lunch+dinner", label: "Lunch + Dinner", meals: ["lunch", "dinner"] },
  { key: "breakfast+lunch+dinner", label: "All three meals", meals: ["breakfast", "lunch", "dinner"] }
];

const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const MEAL_ORDER = ["breakfast", "lunch", "dinner"];
const comboKeyOf = (meals) =>
  MEAL_ORDER.filter((m) => meals.includes(m)).join("+");

export default function Membership() {
  const { settings } = useData();
  const messes = settings?.messes || [];
  const delivery = !!settings?.deliveryEnabled;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    mess: messes[0]?.key || "divya-kitchen",
    meals: ["lunch"],
    startDate: "",
    mealsPerWeek: "7",
    notes: ""
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function priceFor(messKey, meals) {
    const m = messes.find((x) => x.key === messKey);
    if (!m || !meals.length) return 0;
    return Number(m.monthlyPlans?.[comboKeyOf(meals)]) || 0;
  }

  function toggleMeal(id) {
    setForm((f) => {
      const has = f.meals.includes(id);
      const next = has ? f.meals.filter((m) => m !== id) : [...f.meals, id];
      return { ...f, meals: MEAL_ORDER.filter((m) => next.includes(m)) };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setDone(null);
    setBusy(true);
    try {
      const res = await api.createSub({
        ...form,
        mealsPerWeek: Number(form.mealsPerWeek) || 7
      });
      setDone(res.message);
      setForm((f) => ({ ...f, name: "", phone: "", email: "", notes: "" }));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  if (settings && !settings.membershipsEnabled) {
    return (
      <section className="section">
        <div className="container narrow center">
          <h1>Mess memberships</h1>
          <p className="lede" style={{ marginInline: "auto" }}>
            Bookings are closed online at the moment. Please call either mess and we will
            set you up.
          </p>
          {settings.phone && (
            <p style={{ marginTop: "1.75rem" }}>
              <a className="btn btn-primary" href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}>
                Call {settings.phone}
              </a>
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Mess membership</span>
          </nav>
          <p className="eyebrow">Eat with us every day</p>
          <h1>Book a mess slot, pay monthly.</h1>
          <p className="lede">
            Pick a mess, pick lunch or dinner, pay once a month and come in every day. The
            same dishes are on the board whichever mess you choose.
          </p>
        </div>
      </section>

      {/* how it works */}
      <section className="section-sm">
        <div className="container">
          <div className="feature-strip">
            {[
              { n: "01", t: "Book your slot", b: "Choose the mess, the meal, and the day you want to start. We confirm by phone." },
              { n: "02", t: "Pay once a month", b: "One monthly amount for the plan you picked. No per-visit payment, no daily billing." },
              { n: "03", t: "Come in daily", b: "Show your name at the counter and eat. Bring family if your plan allows it." }
            ].map((s) => (
              <article className="feature" key={s.n}>
                <span className="feature-num">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* prices */}
      <section className="section section-alt">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">Monthly plans</p>
              <h2>What it costs</h2>
            </div>
            <p className="section-note">
              Same food, same prices at both messes. Prices shown are per person, per month.
            </p>
          </header>

          <div className="mess-compare">
            {messes.map((m) => (
              <div className="mess-compare-col" key={m.key}>
                <h3>{m.name}</h3>
                <p className="mess-compare-addr">
                  {m.address}
                  {m.city ? `, ${m.city}` : ""}
                </p>
                {mealSchedule(settings).map((s) => (
                  <div className="meal-line" key={s.id}>
                    <span>{s.label} served</span>
                    <strong>{s.serves}</strong>
                  </div>
                ))}

                <div className="plan-list">
                  {ALL_COMBOS.map((c) => {
                    const price = priceFor(m.key, c.meals);
                    return (
                      <div className={"plan-row" + (c.meals.length === form.meals.length && c.meals.every((x) => form.meals.includes(x)) ? " on" : "")} key={c.key}>
                        <div>
                          <strong>{c.label}</strong>
                          <span>{c.meals.length} {c.meals.length === 1 ? "meal" : "meals"} a day</span>
                        </div>
                        <span className="plan-price">{price ? `${rupees(price)}/mo` : "Not offered"}</span>
                      </div>
                    );
                  })}
                </div>

                <a
                  className="btn btn-dark btn-block btn-sm"
                  href="#enquiry"
                  onClick={() => {
                    set("mess", m.key);
                  }}
                >
                  Book at this mess
                </a>
              </div>
            ))}
          </div>

          <p className="card-text small" style={{ marginTop: 20, marginBottom: 0 }}>
            PLACEHOLDER PRICES. Change them in the admin panel under Settings, or we will
            confirm the amount when you call.
          </p>
        </div>
      </section>

      {/* form */}
      <section className="section" id="enquiry">
        <div className="container split" style={{ alignItems: "start" }}>
          <div className="split-text">
            <p className="eyebrow">Book a slot</p>
            <h2>Tell us who you are</h2>
            <p className="lede">
              We will confirm the slot and share payment details. It takes one working day,
              not one hour &mdash; we would rather get the plan right.
            </p>
            <ul className="check-list">
              <li>Any combination of meals: breakfast, lunch, dinner or all three</li>
              <li>One monthly amount, no daily billing</li>
              <li>Switch mess or meal plan any month</li>
              <li>Pause instead of cancelling if you are travelling</li>
              <li>Members can bring delivery orders home too</li>
            </ul>
            <p className="card-text" style={{ marginTop: "1.75rem" }}>
              Not sure yet? <Link to="/today">See today&rsquo;s thali</Link> or{" "}
              <Link to="/order">order one meal first</Link>.
            </p>
          </div>

          <form className="order-form" onSubmit={submit} noValidate>
            <h3 className="form-title">Book a monthly slot</h3>

            {err && <p className="form-msg is-error">{err}</p>}
            {done && (
              <p className="form-msg is-ok">
                {done} <Link to="/track">Track it</Link> with that reference.
              </p>
            )}

            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </label>
              <label className="field">
                <span>Mobile</span>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="98XXXXXXXX" />
              </label>
            </div>

            <label className="field">
              <span>Email <em>optional</em></span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Which mess</span>
                <select value={form.mess} onChange={(e) => set("mess", e.target.value)}>
                  {MESSES.map((m) => {
                    const full = messes.find((x) => x.key === m.key);
                    return (
                      <option key={m.key} value={m.key}>
                        {full?.name || m.label}
                      </option>
                    );
                  })}
                </select>
              </label>
              <div className="field">
                <span className="field-label">Which meals <em>pick any</em></span>
                <div className="meal-chips">
                  {MEAL_ORDER.map((id) => {
                    const on = form.meals.includes(id);
                    return (
                      <button key={id} type="button" className={"chip" + (on ? " on" : "")}
                        onClick={() => toggleMeal(id)} aria-pressed={on}>
                        {on ? "\u2713 " : ""}{MEAL_LABELS[id]}
                      </button>
                    );
                  })}
                </div>
                <em className="field-hint">
                  {form.meals.length === 0
                    ? "Choose at least one meal"
                    : priceFor(form.mess, form.meals)
                      ? `${rupees(priceFor(form.mess, form.meals))} per month`
                      : "That combination is not priced yet, please call us"}
                </em>
              </div>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Start from</span>
                <input
                  type="date"
                  value={form.startDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </label>
              <label className="field">
                <span>Days per week</span>
                <select value={form.mealsPerWeek} onChange={(e) => set("mealsPerWeek", e.target.value)}>
                  {[7, 6, 5, 4, 3, 2, 1].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? "day" : "days"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Anything we should know <em>optional</em></span>
              <textarea
                rows="3"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Jain food, two people instead of one, starting next month..."
              />
            </label>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Sending..." : "Request a slot"}
            </button>
            <p className="card-text small" style={{ marginTop: 14, marginBottom: 0 }}>
              We will call you before taking any payment.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}