import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart, useData } from "../store.jsx";
import { rupees, messLabel } from "../api.js";

/** One dish card, used on the home page, menu page and catering page. */
export function DishCard({ item, showMess = false }) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  function onAdd() {
    add(item.id);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 500);
  }

  const tags = [
    ...(item.tags || []).map((t) => (
      <span className="tag tag-veg" key={t}>
        {t}
      </span>
    )),
    item.featured && <span className="tag tag-hot">Pick</span>,
    <span className="tag tag-vg">Delivery</span>
  ].filter(Boolean);

  const unit = { plate: "", piece: "/pc", head: "/head", event: "/pkg", box: "/box" }[item.unit] ?? "";

  return (
    <article className={"dish" + (justAdded ? " just-added" : "")}>
      <div className="dish-top">
        <h3 className="dish-name">{item.name}</h3>
        <span className="dish-price">
          {rupees(item.price)}
          {unit && <small className="unit">{unit}</small>}
        </span>
      </div>

      {item.desc && <p className="dish-desc">{item.desc}</p>}
      {tags.length > 0 && <div className="tags">{tags}</div>}

      <div className="dish-foot">
        <p className="dish-note">
          {showMess && <span className="pill-inline">{messLabel(item.mess)}</span>}
          {item.serves && <span className="pill-inline">{item.serves}</span>}
          {item.note && <span>{item.note}</span>}
        </p>

        {item.unit === "event" ? (
          <Link className="add-btn" to="/catering">
            Enquire
          </Link>
        ) : (
          <button className="add-btn" type="button" onClick={onAdd}>
            Add
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}

export function QtyButton({ item }) {
  const { setQty } = useCart();
  return (
    <div className="cart-qty">
      <button
        className="qty-btn"
        type="button"
        onClick={() => setQty(item.id, item.qty - 1)}
        aria-label={`Remove one ${item.name}`}
      >
        &minus;
      </button>
      <output aria-label="Quantity">{item.qty}</output>
      <button
        className="qty-btn"
        type="button"
        onClick={() => setQty(item.id, item.qty + 1)}
        aria-label={`Add one ${item.name}`}
      >
        +
      </button>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-note">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="loading-block">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function Stat({ num, label }) {
  return (
    <div className="figure">
      <span className="figure-num">{num}</span>
      <span className="figure-label">{label}</span>
    </div>
  );
}
