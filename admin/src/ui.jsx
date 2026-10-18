/* Shared bits used across admin pages. */

export const rupees = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const formatTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

export const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (d) => `${formatDate(d)}, ${formatTime(d)}`;

export function timeAgo(d) {
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

export const messLabel = (key) =>
  ({
    "divya-kitchen": "Divya's Kitchen",
    "digital-bharat": "Digital Bharat",
    all: "Both"
  })[key] || key;

export const messShort = (key) => ({ "divya-kitchen": "DK", "digital-bharat": "DB", all: "ALL" })[key] || key;

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function PaymentBadge({ payment }) {
  if (!payment) return null;
  const paid = payment.status === "paid";
  return (
    <span className={`badge ${paid ? "badge-paid" : "badge-unpaid"}`}>
      {paid ? `paid · ${payment.method}` : payment.status}
    </span>
  );
}

export function TypeBadge({ type }) {
  return <span className={`badge badge-${type === "catering" ? "catering" : "mess"}`}>{type}</span>;
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function Alert({ kind = "error", children }) {
  if (!children) return null;
  return <div className={`alert alert-${kind}`}>{children}</div>;
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/** Small confirm dialog so we never use window.confirm in an app like this. */
export function Confirm({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="x-btn" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p className="mb-0">{message}</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Item editor modal reused by the mess menu and the packages page. */
export function ItemModal({ item, onSave, onClose, messes, fixedMess }) {
  const blank = {
    name: "",
    price: 0,
    desc: "",
    cat: "mains",
    scope: "mess",
    mess: fixedMess || "divya-kitchen",
    tags: [],
    note: "",
    serves: "",
    unit: "plate",
    available: true,
    featured: false,
    order: 100
  };

  const [form, setForm] = useState(item ? { ...blank, ...item } : blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const TAG_OPTIONS = ["veg", "vegan", "jain-friendly", "spicy", "sweet", "bestseller"];

  async function save() {
    setErr("");
    if (!form.name.trim()) return setErr("Give the dish a name");
    if (!(Number(form.price) >= 0)) return setErr("Price must be zero or more");

    setBusy(true);
    try {
      await onSave({
        ...form,
        price: Number(form.price),
        order: Number(form.order) || 100,
        mess: fixedMess || form.mess
      });
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{item?.id || item?._id ? "Edit" : "New item"}</h2>
          <button className="x-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="modal-body">
          {err && <div className="alert alert-error">{err}</div>}

          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Paneer Butter Masala" />
          </div>

          <div className="row row-2">
            <div className="field">
              <label>Price (₹)</label>
              <input type="number" min="0" step="0.5" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div className="field">
              <label>Sold as</label>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                <option value="plate">Per plate</option>
                <option value="piece">Per piece</option>
                <option value="head">Per head</option>
                <option value="event">Per event</option>
              </select>
            </div>
          </div>

          <div className="row row-2">
            <div className="field">
              <label>Category</label>
              <input value={form.cat} onChange={(e) => set("cat", e.target.value.toLowerCase())} placeholder="mains" />
              <p className="hint">Groups the dish on the website. Keep it consistent.</p>
            </div>
            {!fixedMess && (
              <div className="field">
                <label>Mess</label>
                <select value={form.mess} onChange={(e) => set("mess", e.target.value)}>
                  {messes.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {form.unit === "event" && (
            <div className="field">
              <label>Serves</label>
              <input value={form.serves} onChange={(e) => set("serves", e.target.value)} placeholder="10 - 15 people" />
            </div>
          )}

          <div className="field">
            <label>Description</label>
            <textarea rows="2" value={form.desc} onChange={(e) => set("desc", e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Tags</label>
            <div className="tag-editor">
              {TAG_OPTIONS.map((t) => {
                const on = (form.tags || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={"tag-toggle" + (on ? " on" : "")}
                    onClick={() =>
                      set(
                        "tags",
                        on ? form.tags.filter((x) => x !== t) : [...(form.tags || []), t]
                      )
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label>Note on the board</label>
            <input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Lunch only, 12 left at noon" />
          </div>

          <div className="row row-2">
            <div className="field">
              <label>Sort order</label>
              <input type="number" value={form.order} onChange={(e) => set("order", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">&nbsp;</label>
              <label className="check">
                <input type="checkbox" checked={!!form.available} onChange={(e) => set("available", e.target.checked)} />
                Available today
              </label>
            </div>
          </div>

          <label className="check">
            <input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked)} />
            Show as a pick on the home page
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save item"}
          </button>
        </div>
      </div>
    </div>
  );
}
