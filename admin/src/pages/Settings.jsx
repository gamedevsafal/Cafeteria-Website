import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Spinner, Alert, rupees } from "../ui.jsx";

function Switch({ on, onChange, label }) {
  return (
    <button className={"switch" + (on ? " on" : "")} onClick={() => onChange(!on)} aria-label={label} role="switch" aria-checked={on} />
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setS(await api.adminSettings());
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  function set(path, value) {
    setS((prev) => {
      const next = { ...prev };
      const parts = path.split(".");
      let node = next;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) node[p] = value;
        else {
          node[p] = Array.isArray(node[p]) ? [...node[p]] : { ...node[p] };
          node = node[p];
        }
      });
      return next;
    });
  }

  function setMess(key, field, value) {
    setS((prev) => ({
      ...prev,
      messes: prev.messes.map((m) => (m.key === key ? { ...m, [field]: value } : m))
    }));
  }

  async function save() {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const payload = {
        businessName: s.businessName,
        tagline: s.tagline,
        about: s.about,
        phone: s.phone,
        whatsapp: s.whatsapp,
        email: s.email,
        logo: s.logo,
        minCateringGuests: s.minCateringGuests,
        maxCateringGuests: s.maxCateringGuests,
        serviceFeePercent: s.serviceFeePercent,
        messServiceFee: s.messServiceFee,
        messOrderOpens: s.messOrderOpens,
        messOrderCloses: s.messOrderCloses,
        messOrderLeadMinutes: s.messOrderLeadMinutes,
        maxMealQtyPerOrder: s.maxMealQtyPerOrder,
        cateringLeadDays: s.cateringLeadDays,
        deliveryEnabled: s.deliveryEnabled,
        deliveryFee: s.deliveryFee,
        freeDeliveryOver: s.freeDeliveryOver,
        deliveryMinOrder: s.deliveryMinOrder,
        deliveryOpens: s.deliveryOpens,
        deliveryCloses: s.deliveryCloses,
        deliveryAreas: s.deliveryAreas,
        membershipsEnabled: s.membershipsEnabled,
        paymentLive: s.paymentLive,
        social: s.social,
        messes: s.messes
      };
      setS(await api.saveSettings(payload));
      setOk("Saved. The website is already showing the new values.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (err && !s) return <Alert>{err}</Alert>;
  if (!s) return <Spinner />;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <p className="sub">Everything here is read by the website on every page load.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save all changes"}
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="card">
        <h2>Business</h2>
        <div className="row row-2">
          <Field label="Business name">
            <input value={s.businessName || ""} onChange={(e) => set("businessName", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <input value={s.tagline || ""} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
        </div>
        <Field label="About blurb">
          <textarea rows="3" value={s.about || ""} onChange={(e) => set("about", e.target.value)} />
        </Field>
        <div className="row row-3">
          <Field label="Phone">
            <input value={s.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp" hint="Country code, digits only.">
            <input value={s.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
          <Field label="Email">
            <input value={s.email || ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="Logo URL" hint="Leave blank to use the placeholder mark.">
          <input value={s.logo || ""} onChange={(e) => set("logo", e.target.value)} placeholder="assets/img/logo.png" />
        </Field>
      </div>

      <div className="card">
        <h2>Ordering rules</h2>
        <p className="small muted">
          These control what the order form will accept. Customers who break a rule get told
          to call instead of silently failing.
        </p>

        <div className="row row-2">
          <Field label="Mess orders open">
            <input type="time" value={s.messOrderOpens || ""} onChange={(e) => set("messOrderOpens", e.target.value)} />
          </Field>
          <Field label="Mess orders close">
            <input type="time" value={s.messOrderCloses || ""} onChange={(e) => set("messOrderCloses", e.target.value)} />
          </Field>
        </div>

        <div className="row row-3">
          <Field label="Notice needed (minutes)" hint="Lead time for pickup slots.">
            <input
              type="number"
              min="0"
              value={s.messOrderLeadMinutes}
              onChange={(e) => set("messOrderLeadMinutes", e.target.value)}
            />
          </Field>
          <Field label="Max meals per order">
            <input
              type="number"
              min="1"
              value={s.maxMealQtyPerOrder}
              onChange={(e) => set("maxMealQtyPerOrder", e.target.value)}
            />
          </Field>
          <Field label="Mess service charge (₹)">
            <input
              type="number"
              min="0"
              value={s.messServiceFee}
              onChange={(e) => set("messServiceFee", e.target.value)}
            />
          </Field>
        </div>

        <div className="row row-3">
          <Field label="Catering from (guests)">
            <input
              type="number"
              min="1"
              value={s.minCateringGuests}
              onChange={(e) => set("minCateringGuests", e.target.value)}
            />
          </Field>
          <Field label="Catering to (guests)">
            <input
              type="number"
              min="1"
              value={s.maxCateringGuests}
              onChange={(e) => set("maxCateringGuests", e.target.value)}
            />
          </Field>
          <Field label="Catering notice (days)">
            <input
              type="number"
              min="0"
              value={s.cateringLeadDays}
              onChange={(e) => set("cateringLeadDays", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Catering service charge (%)">
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={s.serviceFeePercent}
            onChange={(e) => set("serviceFeePercent", e.target.value)}
          />
        </Field>

        <h2 style={{ marginTop: 22 }}>Home delivery</h2>
        <p className="small muted">The same dishes, delivered inside Gwalior city.</p>

        <div className="row row-3">
          <Field label="Delivery fee (₹)">
            <input type="number" min="0" value={s.deliveryFee}
              onChange={(e) => set("deliveryFee", e.target.value)} />
          </Field>
          <Field label="Free over (₹)">
            <input type="number" min="0" value={s.freeDeliveryOver}
              onChange={(e) => set("freeDeliveryOver", e.target.value)} />
          </Field>
          <Field label="Minimum order (₹)">
            <input type="number" min="0" value={s.deliveryMinOrder}
              onChange={(e) => set("deliveryMinOrder", e.target.value)} />
          </Field>
        </div>

        <div className="row row-2">
          <Field label="Delivery from">
            <input type="time" value={s.deliveryOpens || ""}
              onChange={(e) => set("deliveryOpens", e.target.value)} />
          </Field>
          <Field label="Delivery till">
            <input type="time" value={s.deliveryCloses || ""}
              onChange={(e) => set("deliveryCloses", e.target.value)} />
          </Field>
        </div>

        <Field label="Areas you deliver to">
          <input value={s.deliveryAreas || ""} onChange={(e) => set("deliveryAreas", e.target.value)}
            placeholder="Gwalior city" />
        </Field>

        <div className="switch-row">
          <div className="txt">
            <strong>Offer home delivery</strong>
            <span>Turn off to offer pickup only. Customers then see collection at either mess.</span>
          </div>
          <Switch on={!!s.deliveryEnabled} onChange={(v) => set("deliveryEnabled", v)} label="Home delivery" />
        </div>

        <div className="switch-row">
          <div className="txt">
            <strong>Monthly mess memberships</strong>
            <span>Lets customers book a monthly slot online. Prices are set per mess below.</span>
          </div>
          <Switch on={!!s.membershipsEnabled} onChange={(v) => set("membershipsEnabled", v)} label="Memberships" />
        </div>

        <div className="switch-row">
          <div className="txt">
            <strong>Card payments (Stripe)</strong>
            <span>
              Off: pay at the counter, which is what the site promises now. Turn on once the
              Stripe keys are in <code>server/.env</code>.
            </span>
          </div>
          <Switch on={!!s.paymentLive} onChange={(v) => set("paymentLive", v)} label="Card payments" />
        </div>
      </div>

      <div className="card">
        <h2>The two messes</h2>
        {(s.messes || []).map((m) => (
          <div key={m.key} style={{ padding: "14px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <div className="card-head" style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{m.name}</h3>
              <Switch
                on={!!m.active}
                onChange={(v) => setMess(m.key, "active", v)}
                label={`${m.name} visible`}
              />
            </div>
            <div className="row row-2">
              <Field label="Address">
                <input value={m.address || ""} onChange={(e) => setMess(m.key, "address", e.target.value)} />
              </Field>
              <Field label="City">
                <input value={m.city || ""} onChange={(e) => setMess(m.key, "city", e.target.value)} />
              </Field>
            </div>
            <div className="row row-3" style={{ marginBottom: 12 }}>
              <Field label="Monthly lunch (₹)">
                <input type="number" min="0" value={m.monthlyLunch ?? 0}
                  onChange={(e) => setMess(m.key, "monthlyLunch", e.target.value)} />
              </Field>
              <Field label="Monthly dinner (₹)">
                <input type="number" min="0" value={m.monthlyDinner ?? 0}
                  onChange={(e) => setMess(m.key, "monthlyDinner", e.target.value)} />
              </Field>
              <Field label="Monthly lunch + dinner (₹)">
                <input type="number" min="0" value={m.monthlyBoth ?? 0}
                  onChange={(e) => setMess(m.key, "monthlyBoth", e.target.value)} />
              </Field>
            </div>
            <div className="row row-4" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              <Field label="Lunch from">
                <input type="time" value={m.opens || ""} onChange={(e) => setMess(m.key, "opens", e.target.value)} />
              </Field>
              <Field label="Lunch till">
                <input type="time" value={m.closes || ""} onChange={(e) => setMess(m.key, "closes", e.target.value)} />
              </Field>
              <Field label="Dinner from">
                <input
                  type="time"
                  value={m.dinnerOpens || ""}
                  onChange={(e) => setMess(m.key, "dinnerOpens", e.target.value)}
                />
              </Field>
              <Field label="Dinner till">
                <input
                  type="time"
                  value={m.dinnerCloses || ""}
                  onChange={(e) => setMess(m.key, "dinnerCloses", e.target.value)}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Social links</h2>
        <p className="small muted">Blank ones are hidden on the website.</p>
        {["instagram", "facebook", "youtube"].map((k) => (
          <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
            <input
              value={(s.social || {})[k] || ""}
              onChange={(e) => set(`social.${k}`, e.target.value)}
              placeholder="https://"
            />
          </Field>
        ))}
      </div>

      <div style={{ position: "sticky", bottom: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-primary" onClick={save} disabled={busy} style={{ boxShadow: "var(--shadow-lg)" }}>
          {busy ? "Saving..." : "Save all changes"}
        </button>
      </div>
    </>
  );
}
