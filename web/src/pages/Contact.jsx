import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../store.jsx";
import { api, mealSchedule } from "../api.js";

export default function Contact() {
  const { settings } = useData();

  const [form, setForm] = useState({ name: "", phone: "", email: "", topic: "General question", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    setDone(null);
    try {
      const res = await api.createEnquiry(form);
      setDone(res.message);
      setForm({ name: "", phone: "", email: "", topic: "General question", message: "" });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const messes = settings?.messes || [];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Contact</span>
          </nav>
          <p className="eyebrow">Come by, or pick up the phone</p>
          <h1>Talk to the kitchen</h1>
          <p className="lede">
            For same-day mess orders please call. For catering quotes, use the form and we
            will come back within a working day.
          </p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container card-grid">
          {messes.map((m) => (
            <div className="card" key={m.key}>
              <p className="eyebrow">{m.key === "divya-kitchen" ? "Mess one" : "Mess two"}</p>
              <h2 style={{ fontSize: "1.5rem" }}>{m.name}</h2>
              <address className="address">
                {m.address}
                {m.city ? (
                  <>
                    <br />
                    {m.city}
                  </>
                ) : null}
              </address>
              {mealSchedule(settings).map((s) => (
                <div className="meal-line" key={s.id}>
                  <span>{s.label}</span>
                  <strong>{s.serves}</strong>
                </div>
              ))}
              {m.phone && (
                <p className="card-text" style={{ marginTop: 14 }}>
                  <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}>{m.phone}</a>
                </p>
              )}
            </div>
          ))}

          <div className="card">
            <p className="eyebrow">Reach us</p>
            <h2 style={{ fontSize: "1.5rem" }}>Phone, WhatsApp, email</h2>
            {settings?.phone && (
              <p className="card-text">
                <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}>{settings.phone}</a>
              </p>
            )}
            {settings?.whatsapp && (
              <p className="card-text">
                <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </p>
            )}
            {settings?.email && (
              <p className="card-text">
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </p>
            )}
            <p className="card-text small" style={{ marginBottom: 0 }}>
              Ordering for {settings?.minCateringGuests}+ guests? Use the{" "}
              <Link to="/catering">catering form</Link> instead, it reaches us faster.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="enquiry">
        <div className="container split" style={{ alignItems: "start" }}>
          <div className="split-text">
            <p className="eyebrow">Send a message</p>
            <h2>Ask us anything</h2>
            <p className="lede">
              A question about the menu, Jain options, a bulk order for the office, or
              feedback about something we got wrong.
            </p>
            <ul className="check-list">
              <li>We reply within one working day</li>
              <li>Same-day mess orders: call, do not use this form</li>
              <li>We do not take table reservations, both messes are takeaway</li>
              <li>Lost property is behind the counter, kept a month</li>
            </ul>
          </div>

          <form className="order-form" onSubmit={submit} noValidate>
            <h3 className="form-title">Your message</h3>

            {err && <p className="form-msg is-error">{err}</p>}
            {done && <p className="form-msg is-ok">{done}</p>}

            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </label>
              <label className="field">
                <span>Phone <em>optional</em></span>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </label>
            </div>

            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </label>

            <label className="field">
              <span>What is it about?</span>
              <select value={form.topic} onChange={(e) => set("topic", e.target.value)}>
                {["General question", "Bulk office order", "Catering quote", "Allergies and diet", "Feedback", "Working with us", "Something else"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Message</span>
              <textarea rows="5" value={form.message} onChange={(e) => set("message", e.target.value)} required />
            </label>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send message"}
            </button>
          </form>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container narrow">
          <p className="eyebrow">Before you ask</p>
          <h2>Common questions</h2>
          <div className="faq" style={{ marginTop: "1.75rem" }}>
            {[
              { q: "Do you cater for 100 guests?", a: `Yes, ${settings?.minCateringGuests} is our minimum and we go up to ${settings?.maxCateringGuests}. Below 100 please ask, we can often do it.` },
              { q: "Do you do Jain food?", a: "Yes. Most dishes can be made Jain friendly, meaning no onion and no garlic. Give us a day's notice so we plan the shopping." },
              { q: "Is everything vegetarian?", a: "Everything. There is no non-veg on any menu, at either mess or on any catering order." },
              { q: "How much notice for a wedding?", a: `At least ${settings?.cateringLeadDays} days so we can plan staff, vessels and shopping. More is better for bigger functions.` },
              { q: "Do you deliver?", a: "Within Gwalior we deliver for catering orders, quoted separately once we know the venue. Mess food is collection only." },
              { q: "Can I order mess food for today?", a: `Yes, online between ${settings?.messOrderOpens} and ${settings?.messOrderCloses} with ${settings?.messOrderLeadMinutes} minutes notice. Or call either mess directly.` },
              { q: "Is there a service charge?", a: "Packages are all-in prices. Delivery, staff and crockery are quoted separately if you need them." },
              { q: "Do you do corporate billing?", a: "Yes, we issue proper invoices with GST. Send us the company details on the catering form." }
            ].map((f, i) => (
              <details key={i} open={i === 0}>
                <summary>{f.q}</summary>
                <p className="faq-body">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
