import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupees } from "../api.js";
import { Loading } from "../components/DishCard.jsx";

const MEAL_META = {
  breakfast: { label: "Breakfast", icon: "sun", note: "Served 8:30 - 10:30" },
  lunch: { label: "Lunch", icon: "plate", note: "Served 12:00 - 2:00" },
  dinner: { label: "Dinner", icon: "moon", note: "Served 7:00 - 9:00" }
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

function Thali({ title, meta, price, items, extras = [], note, closed = false }) {
  return (
    <article className={"thali" + (closed ? " is-closed" : "")}>
      <header className="thali-head">
        <span className="thali-icon"><Icon name={meta.icon} /></span>
        <div>
          <h3>{title}</h3>
          <span className="thali-note">{closed ? "Not served today" : meta.note}</span>
        </div>
        {closed ? (
          <span className="thali-price is-closed">Closed</span>
        ) : (
          price > 0 && <span className="thali-price">{rupees(price)}</span>
        )}
      </header>

      {closed ? (
        <p className="thali-closed-note">
          We do not serve {title.toLowerCase()} today. Please call the mess if you need food
          arranged.
        </p>
      ) : (
        <ul className="thali-items">
          {items.length ? (
            items.map((i, n) => <li key={n}><span className="thali-dot" />{i}</li>)
          ) : (
            <li><span className="thali-dot" />Not set for today</li>
          )}
          {extras.filter(Boolean).map((x, n) => (
            <li key={"x" + n} className="is-extra">
              <span className="thali-dot" />
              {x}
            </li>
          ))}
        </ul>
      )}

      {note && <p className="thali-today-note">{note}</p>}
    </article>
  );
}

export default function Today() {
  const [today, setToday] = useState(null);
  const [week, setWeek] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, w] = await Promise.all([api.todayMenu(), api.weekMenu()]);
        if (!alive) return;
        setToday(t);
        setWeek(w);
      } catch (e) {
        if (alive) setErr(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (err) return <div className="container"><div className="alert alert-error">{err}</div></div>;
  if (!today || !week) return <div className="container"><Loading label="Loading today’s thali" /></div>;

  const m = today.menu;

  /* A meal can be closed for the day (Sunday dinner) without the kitchen
     being shut. Only a whole-day closure hides the whole page. */
  const wholeDayClosed = !!m?.closed;

  const lunchItems = m
    ? [m.lunchSabji?.name, m.lunchDal?.name, m.lunchDrySabji?.name].filter(Boolean)
    : [];
  const dinnerItems = m
    ? [m.dinnerSabji?.name, m.dinnerDrySabji?.name].filter(Boolean)
    : [];

  const extras = m
    ? [
        m.roti !== false ? (m.ghee !== false ? "Roti with ghee" : "Roti") : null,
        m.rice !== false ? "Rice" : null,
        m.salad ? "Salad" : null
      ]
    : [];

  /* breakfast, lunch and dinner, each flagged if it is off today */
  const meals = [
    { id: "breakfast", label: "Breakfast", window: "Served 8:30 - 10:30", price: m?.priceBreakfast,
      items: m?.breakfast?.name ? [m.breakfast.name] : [], closed: !!m?.breakfastClosed },
    { id: "lunch", label: "Lunch", window: "Served 12:00 - 2:00", price: m?.priceLunch,
      items: lunchItems, closed: false },
    { id: "dinner", label: "Dinner", window: "Served 7:00 - 9:00", price: m?.priceDinner,
      items: dinnerItems, closed: !!m?.dinnerClosed }
  ];

  const anyOpen = meals.some((x) => !x.closed && x.items.length);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">Today&rsquo;s thali</span>
          </nav>
          <p className="eyebrow">{today.dayName}</p>
          <h1>{wholeDayClosed ? "Kitchen closed today" : "What’s cooking today"}</h1>
          <p className="lede">
            {wholeDayClosed
              ? "We are not serving today. Please check back tomorrow or call either mess."
              : "Freshly made every morning. The same thali is served at both messes, and it can be delivered inside Gwalior."}
          </p>
          {!wholeDayClosed && meals.some((x) => x.closed) && (
            <p className="open-note is-closed">
              {meals
                .filter((x) => x.closed)
                .map((x) => x.label)
                .join(" and ")}{" "}
              {meals.filter((x) => x.closed).length === 1 ? "is" : "are"} closed today. The
              other {meals.filter((x) => !x.closed).length === 1 ? "meal is" : "meals are"}{" "}
              served as usual.
            </p>
          )}
          {today.isOverride && !wholeDayClosed && (
            <p className="open-note is-open">Special menu for today. Different from the usual weekly plan.</p>
          )}
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          {wholeDayClosed ? (
            <div className="card center">
              <h2>Closed today</h2>
              <p className="card-text">Please come back tomorrow, or call either mess and we will sort you out.</p>
            </div>
          ) : (
            <>
              <div className="thali-grid">
                {meals.map((meal) => (
                  <Thali
                    key={meal.id}
                    title={meal.label}
                    meta={MEAL_META[meal.id]}
                    price={meal.closed ? 0 : meal.price}
                    items={meal.closed ? [] : meal.items}
                    extras={meal.closed ? [] : meal.id === "breakfast" ? [] : extras}
                    closed={meal.closed}
                  />
                ))}
              </div>

              {!anyOpen && (
                <div className="alert alert-warn" style={{ marginTop: 22 }}>
                  Nothing has been set for today yet. Please call either mess and we will tell
                  you what is cooking.
                </div>
              )}

              {m?.note && (
                <div className="alert alert-warn" style={{ marginTop: 22 }}>
                  {m.note}
                </div>
              )}

              <div className="center" style={{ marginTop: 34 }}>
                <p className="card-text" style={{ maxWidth: "46ch", marginInline: "auto" }}>
                  All meals are prepared fresh with authentic spices and pure ingredients.
                </p>
                <p style={{ marginTop: "1.25rem" }}>
                  <Link className="btn btn-primary" to="/order">Order this thali</Link>
                  <Link className="btn btn-ghost" to="/membership">Or book a monthly slot</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------- weekly plan ---------------- */}
      <section className="section section-alt">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">How the week works</p>
              <h2>The weekly food plan</h2>
            </div>
            <p className="section-note">
              Our mess is not a la carte. Every day is a thali: <strong>one dal, one sabji,
              roti with ghee and rice</strong>. The plan below rotates so you always know
              what you are eating.
            </p>
          </header>

          <div className="table-wrap week-table">
            <table className="plan-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Breakfast</th>
                  <th>Lunch</th>
                  <th>Dinner</th>
                </tr>
              </thead>
              <tbody>
                {week.map((d) => (
                  <tr key={d.day} className={d.day === new Date().getDay() ? "is-today" : ""}>
                    <th scope="row">
                      {d.label}
                      {d.day === new Date().getDay() && <span className="pill-inline">Today</span>}
                    </th>
                    <td>{d.breakfast?.name || "-"}</td>
                    <td>
                      {d.lunchSabji?.name && <strong>{d.lunchSabji.name}</strong>}
                      {d.lunchDal?.name && <span className="plan-sub">{d.lunchDal.name}</span>}
                      {d.lunchDrySabji?.name && <span className="plan-sub">{d.lunchDrySabji.name}</span>}
                      {d.roti !== false && <span className="plan-include">Roti with ghee · Rice</span>}
                    </td>
                    <td>
                      {d.dinnerSabji?.name && <strong>{d.dinnerSabji.name}</strong>}
                      {d.dinnerDrySabji?.name && <span className="plan-sub">{d.dinnerDrySabji.name}</span>}
                      {d.roti !== false && <span className="plan-include">Roti with ghee · Rice</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: 28 }}>
            <h3>Sunday special feast, rotating</h3>
            <p className="card-text">
              Every Sunday lunch is a feast instead of the usual dal thali. These five rotate:
            </p>
            <ol className="sunday-list">
              {[
                ["Paneer ki Sabji", "Roti & Sweet"],
                ["Chole ki Sabji", "Puri, Raita & Kheer"],
                ["Rajma Chawal", "Raita & Sweet"],
                ["Veg Biryani", "Raita & Sweet"],
                ["Soya Chaap", "Roti & Rice"]
              ].map((x) => (
                <li key={x[0]}>
                  <strong>{x[0]}</strong>
                  <span>{x[1]}</span>
                </li>
              ))}
            </ol>

            <h3 style={{ marginTop: 26 }}>Dry sabji in rotation</h3>
            <div className="tags" style={{ marginTop: 8 }}>
              {["Aloo Methi", "Bhindi", "Baigan Allu", "Patta Gobhi", "Mix Veg"].map((s) => (
                <span className="tag" key={s}>{s}</span>
              ))}
            </div>

            <p className="card-text small" style={{ marginTop: 20, marginBottom: 0 }}>
              The kitchen updates this every week and the website shows today&rsquo;s plan
              first, so you always know before you walk over.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}