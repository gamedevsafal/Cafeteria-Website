import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../store.jsx";
import { Stat, Loading } from "../components/DishCard.jsx";
import { api, rupees, todayLabel, mealSchedule } from "../api.js";

const MEAL_ICON = {
  breakfast: {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  },
  lunch: {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M4 11h16a8 8 0 0 1-16 0Z" />
        <path d="M7 11c0-3 1-5 2-5s2 2 2 5" />
        <path d="M13 11c0-3 1-5 2-5s2 2 2 5" />
      </svg>
    )
  },
  dinner: {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z" />
      </svg>
    )
  }
};

export default function Home() {
  const { settings, packages } = useData();
  const [todayMeals, setTodayMeals] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .meals()
      .then((d) => alive && setTodayMeals(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const messes = settings?.messes || [];
  const ticketMeals = todayMeals?.meals || [];

  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Pure veg &middot; Gwalior &middot; Fresh every day</p>
            <h1>{settings?.tagline || "Ghar jaisa swad, har din nayi variety"}</h1>
            <p className="lede">
              One dal, one sabji, roti with ghee and rice &mdash; freshly made every morning
              at both our messes. We deliver inside Gwalior, and we cater festivals and family
              functions from {settings?.minCateringGuests} to {settings?.maxCateringGuests} guests.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/order">
                Order today&rsquo;s thali
              </Link>
              <Link className="btn btn-ghost" to="/catering">
                Catering packages
              </Link>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>Today at</dt>
                <dd>{todayMeals?.dayName || todayLabel().split(" ")[0]}</dd>
              </div>
              <div>
                <dt>Messes</dt>
                <dd>{messes.length} kitchens</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{settings?.deliveryEnabled ? "In Gwalior" : "Pickup only"}</dd>
              </div>
            </dl>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="plate">
              <img
                className="plate-photo"
                src="/thali.png"
                alt=""
                width="500"
                height="500"
                fetchPriority="high"
              />
            </div>
            <div className="ticket">
              <p className="ticket-head">Today&rsquo;s thali</p>
              {ticketMeals.length === 0 ? (
                <p className="ticket-foot">Loading</p>
              ) : (
                ticketMeals.map((m) => (
                  <p className="ticket-line" key={m.meal}>
                    <span>{m.label}</span>
                    <span>{m.price ? rupees(m.price) : "closed"}</span>
                  </p>
                ))
              )}
              <p className="ticket-foot">Dal &middot; Sabji &middot; Roti with ghee &middot; Rice</p>
            </div>
          </div>
        </div>
      </section>

      <section className="marquee" aria-hidden="true">
        <div className="marquee-track">
          <div className="marquee-group">
            <span>Marriage catering</span><span>&bull;</span>
            <span>Ring ceremony</span><span>&bull;</span>
            <span>Birthday parties</span><span>&bull;</span>
            <span>Corporate orders</span><span>&bull;</span>
            <span>100 to 2000 guests</span><span>&bull;</span>
            <span>Pure vegetarian</span><span>&bull;</span>
            <span>Jain friendly</span><span>&bull;</span>
          </div>
          <div className="marquee-group">
            <span>Marriage catering</span><span>&bull;</span>
            <span>Ring ceremony</span><span>&bull;</span>
            <span>Birthday parties</span><span>&bull;</span>
            <span>Corporate orders</span><span>&bull;</span>
            <span>100 to 2000 guests</span><span>&bull;</span>
            <span>Pure vegetarian</span><span>&bull;</span>
            <span>Jain friendly</span><span>&bull;</span>
          </div>
        </div>
      </section>

{/* ---------------- what's on today ---------------- */}
      <section className="section">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">On the counter now</p>
              <h2>What we&rsquo;re cooking today</h2>
            </div>
            <p className="section-note">
              {todayMeals ? (
                <>
                  {todayMeals.dayName}&rsquo;s plan. The same thali at both messes, and it
                  can be delivered inside {settings?.deliveryAreas || "Gwalior"}.
                </>
              ) : (
                "The kitchen publishes today&rsquo;s plan every morning."
              )}
            </p>
          </header>

          {!todayMeals ? (
            <Loading label="Loading today's plan" />
          ) : todayMeals.closed ? (
            <div className="card center">
              <h3>Closed today</h3>
              <p className="card-text mb-0">
                We are not serving today. Please call either mess and we will sort you out.
              </p>
            </div>
          ) : (
            <>
              <div className="thali-grid">
                {todayMeals.meals.map((m) => {
                  const meta = MEAL_ICON[m.meal];
                  return (
                    <article className={"thali" + (m.orderable ? "" : " is-off")} key={m.meal}>
                      <header className="thali-head">
                        <span className="thali-icon">{meta.icon}</span>
                        <div>
                          <h3>{m.label}</h3>
                          <span className="thali-note">
                            {m.closedByDay
                              ? "Closed on " + todayMeals.dayName + "s"
                              : m.orderable
                                ? "Order now"
                                : `Orders ${m.orderOpens} - ${m.orderCutoff}`}
                          </span>
                        </div>
                        {m.price > 0 && <span className="thali-price">{rupees(m.price)}</span>}
                      </header>
                      <ul className="thali-items">
                        {(m.dishes ? m.dishes.split(", ") : ["Not served today"]).map((d, i) => (
                          <li key={i}>
                            <span className="thali-dot" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>

              <div className="toolbar-row" style={{ marginTop: 26, justifyContent: "center" }}>
                <span className="pill-inline">Same menu at both messes</span>
                <span className="pill-inline">Delivery inside Gwalior</span>
                <Link className="btn btn-primary btn-sm" to="/order">
                  Order this thali
                </Link>
                <Link className="btn btn-ghost btn-sm" to="/today">
                  See the weekly plan
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------- catering teaser ---------------- */}
      <section className="section section-alt">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">Catering</p>
              <h2>Every occasion, {settings?.minCateringGuests} to {settings?.maxCateringGuests} guests</h2>
            </div>
            <Link className="btn btn-primary btn-sm" to="/catering">
              All catering options
            </Link>
          </header>

          <div className="feature-strip">
            {[
              { icon: "ring", title: "Marriage", body: "Full wedding catering, multi-day menus, on-site staff and clean-up." },
              { icon: "star", title: "Ring Ceremony", body: "Morning chai to evening snacks and dinner, timed to your pandit schedule." },
              { icon: "cake", title: "Birthday", body: "Party packs for kids and adults. Jain-friendly and no-onion-no-garlic on request." },
              { icon: "case", title: "Corporate", body: "Office lunches, conferences and annual days. Invoices and GST-ready billing." }
            ].map((c) => (
              <article className="feature" key={c.title}>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </article>
            ))}
          </div>

          {packages.length > 0 && (
            <div className="package-strip">
              {packages.map((p) => (
                <div className="package-mini" key={p.id}>
                  <span className="package-serves">{p.serves}</span>
                  <span className="package-price">{rupees(p.price)}</span>
                </div>
              ))}
              <Link className="btn btn-dark" to="/catering">
                Full package details
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- two messes ---------------- */}
      <section className="section">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">Where to find us</p>
              <h2>Two messes, one standard</h2>
            </div>
            <Link className="btn btn-ghost btn-sm" to="/contact">
              Directions &amp; contact
            </Link>
          </header>

          <div className="card-grid">
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
                <p style={{ marginTop: 14, marginBottom: 0 }}>
                  <Link className="btn btn-ghost btn-sm" to="/menu">
                    See today&rsquo;s menu
                  </Link>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- numbers ---------------- */}
      <section className="section-sm section-alt">
        <div className="container">
          <div className="figure-grid">
            <Stat num={`${settings?.minCateringGuests}-${settings?.maxCateringGuests}`} label="Guests we cater" />
            <Stat num="100%" label="Pure vegetarian" />
            <Stat num={messes.length} label="Messes in Gwalior" />
            <Stat num="2" label="Days notice needed" />
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section-sm section-dark">
        <div className="container center">
          <p className="eyebrow">Ready when you are</p>
          <h2>Tell us the date and the guest count.</h2>
          <p style={{ maxWidth: "52ch", marginInline: "auto" }}>
            We will come back with a menu and a number the same week. No obligation, no
            hidden charges.
          </p>
          <p style={{ marginTop: "1.75rem" }}>
            <Link className="btn btn-primary" to="/catering">
              Get a quote
            </Link>
            <Link className="btn btn-ghost" to="/order" style={{ color: "#fff", borderColor: "#fff" }}>
              Order mess food
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
