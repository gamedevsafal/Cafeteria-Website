import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../store.jsx";
import { api, rupees, EVENT_TYPES } from "../api.js";

const INCLUSIONS = [
  "One Paneer Sabji",
  "Dal Makhani",
  "One Dry Sabji",
  "Rice",
  "Roti",
  "One Sweet"
];

export default function Catering() {
  const { packages, settings } = useData();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    people: "",
    eventType: "marriage",
    eventDate: "",
    address: "",
    message: ""
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const min = settings?.minCateringGuests ?? 100;
  const max = settings?.maxCateringGuests ?? 2000;
  const leadDays = settings?.cateringLeadDays ?? 3;

  const minDate = new Date(Date.now() + leadDays * 86400000).toISOString().slice(0, 10);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    setDone(null);
    try {
      const res = await api.createEnquiry({
        ...form,
        people: Number(form.people) || null,
        topic: `${EVENT_TYPES.find((t) => t.id === form.eventType)?.label} catering`
      });
      setDone(res.message);
      setForm({ name: "", phone: "", email: "", people: "", eventType: "marriage", eventDate: "", address: "", message: "" });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Catering</span>
          </nav>
          <p className="eyebrow">Weddings, functions and offices</p>
          <h1>Catering for {min} to {max} guests.</h1>
          <p className="lede">
            One kitchen team, one menu style, no frozen anything. Pick a package below as a
            starting point, then tell us your date and we will send a proper quote.
          </p>
        </div>
      </section>

      {/* ---------------- event types ---------------- */}
      <section className="section">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">What we cook for</p>
              <h2>Every occasion we take</h2>
            </div>
            <p className="section-note">
              Pick the one closest to yours when you fill in the form below.
            </p>
          </header>

          <div className="feature-strip">
            {EVENT_TYPES.filter((t) => t.id !== "other").map((t) => (
              <article className="feature" key={t.id}>
                <h3>{t.label}</h3>
                <p>{t.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- festival banner ---------------- */}
      {(settings?.festivalNote || packages.some((p) => p.name.toLowerCase().includes("festival"))) && (
        <section className="section-sm section-dark">
          <div className="container center">
            <p className="eyebrow">Festival bookings open</p>
            <h2>Har Utsav Mein Swad ka Saath</h2>
            <p style={{ maxWidth: "54ch", marginInline: "auto" }}>
              Special festival packages for puja, bhog, diwali milan, birthdays and
              house functions. Freshly made, packed hot, delivered across Gwalior.
            </p>
            {settings?.festivalNote && (
              <p className="festival-dates">{settings.festivalNote}</p>
            )}
            <p style={{ marginTop: "1.5rem" }}>
              <a className="btn btn-primary" href="#enquiry">Enquire now</a>
              {settings?.phone && (
                <a className="btn btn-ghost" href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} style={{ color: "#fff", borderColor: "#fff" }}>
                  Call {settings.phone}
                </a>
              )}
            </p>
          </div>
        </section>
      )}

      {/* ---------------- packages ---------------- */}
      <section className="section section-alt">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">Packages</p>
              <h2>Fixed packs, fixed price</h2>
            </div>
            <p className="section-note">
              Every package is for lunch or dinner and includes the same six things. Prices
              are the whole price, not per head.
            </p>
          </header>

          {packages.length === 0 ? (
            <div className="card">
              <p className="mb-0">Packages are being updated. Please call us and we will send the current list.</p>
            </div>
          ) : (
            <>
              <div className="package-grid">
                {packages.map((p) => {
                  const minGuests = parseInt(p.serves, 10);
                  const perHead = Number.isFinite(minGuests) && minGuests > 0 ? p.price / minGuests : null;
                  return (
                    <article className={"package" + (p.featured ? " is-pick" : "")} key={p.id}>
                      {p.featured && <span className="package-flag">Most booked</span>}
                      <h3>{p.name}</h3>
                      <p className="package-serves-large">{p.serves}</p>
                      <p className="package-amount">{rupees(p.price)}</p>
                          {p.note && <p className="package-range">{p.note}</p>}
                      {perHead && (
                        <p className="package-head">{rupees(Math.ceil(perHead))} per head, from</p>
                      )}
                      <p className="package-desc">{p.desc}</p>
                      <ul className="package-includes">
                        {INCLUSIONS.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                      <a className="btn btn-primary btn-block" href="#enquiry" onClick={() => set("message", `I am interested in the ${p.name} (${p.serves}, ${rupees(p.price)}).`)}>
                        Enquire about this
                      </a>
                    </article>
                  );
                })}
              </div>

              <div className="card" style={{ marginTop: 28 }}>
                <h3>What is not included</h3>
                <ul className="check-list">
                  <li>Delivery is quoted separately once we know the venue</li>
                  <li>Staff and crockery are quoted per event if you need them on site</li>
                  <li>Deco, sweets beyond the one included dish, and cold drinks are extra</li>
                  <li>Any change to guest count after the final count is billed per head</li>
                </ul>
                <p className="card-text small" style={{ marginTop: 16, marginBottom: 0 }}>
                  These are placeholders. Edit the exact inclusions in the admin panel under
                  Catering packages.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------- enquiry form ---------------- */}
      <section className="section" id="enquiry">
        <div className="container split" style={{ alignItems: "start" }}>
          <div className="split-text">
            <p className="eyebrow">Get a quote</p>
            <h2>Tell us the date and the guest count</h2>
            <p className="lede">
              We reply within one working day with a menu and a number. If it is urgent,
              call instead.
            </p>
            <ul className="check-list">
              <li>We need at least {leadDays} days&rsquo; notice</li>
              <li>We can do Jain-friendly menus on request</li>
              <li>Multi-day wedding catering is normal for us</li>
              <li>Invoices and GST details supplied for corporate</li>
            </ul>
            {settings?.phone && (
              <p style={{ marginTop: "1.75rem" }}>
                <a className="btn btn-dark" href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}>
                  Call {settings.phone}
                </a>
              </p>
            )}
          </div>

          <form className="order-form" onSubmit={submit} noValidate>
            <h3 className="form-title">Your enquiry</h3>

            {err && <p className="form-msg is-error">{err}</p>}
            {done && <p className="form-msg is-ok">{done}</p>}

            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Your name" />
              </label>
              <label className="field">
                <span>Mobile</span>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="98XXXXXXXX" />
              </label>
            </div>

            <label className="field">
              <span>Email <em>optional</em></span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Occasion</span>
                <select value={form.eventType} onChange={(e) => set("eventType", e.target.value)}>
                  {EVENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Guests</span>
                <input type="number" min={min} max={max} value={form.people} onChange={(e) => set("people", e.target.value)} placeholder={String(min)} required />
              </label>
            </div>

            <label className="field">
              <span>Event date</span>
              <input type="date" min={minDate} value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} required />
              <em className="field-hint">Earliest we can take is {minDate}</em>
            </label>

            <label className="field">
              <span>Venue or delivery address</span>
              <textarea rows="2" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Hall name, area, Gwalior" required />
            </label>

            <label className="field">
              <span>Anything else <em>optional</em></span>
              <textarea rows="3" value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Jain menu, lunch on both days, need staff..." />
            </label>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Sending..." : "Request a quote"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
