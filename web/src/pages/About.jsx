import { Link } from "react-router-dom";
import { useData } from "../store.jsx";
import { Stat } from "../components/DishCard.jsx";

export default function About() {
  const { settings } = useData();
  const messes = settings?.messes || [];

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span aria-current="page">About</span>
          </nav>
          <p className="eyebrow">Who we are</p>
          <h1>{settings?.tagline || "Ghar jaise shudh khane ki guarantee"}</h1>
          <p className="lede">{settings?.about}</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container narrow">
          <h2>Why we say it</h2>
          <p>
            That line is not a slogan, it is the standard we cook to. Nothing goes into a
            pot that we would not serve at our own table. No rehydrated mixes, no colour
            added for looks, and nothing reheated from a freezer.
          </p>
          <p>
            Divya Catering runs two messes in Gwalior. Divya&rsquo;s Kitchen in Madhuban
            Colony, Thatipur is the main kitchen. Digital Bharat Mess in New Bank Colony
            serves the same food from the same standards for families and offices nearby.
          </p>
          <p>
            The catering side takes the same kitchen to weddings, ring ceremonies, birthdays
            and corporate days, for anything from {settings?.minCateringGuests} to{" "}
            {settings?.maxCateringGuests} guests.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <header className="section-head">
            <div>
              <p className="eyebrow">House rules</p>
              <h2>Six things we do not compromise on</h2>
            </div>
          </header>

          <div className="feature-strip">
            {[
              { t: "100% vegetarian", b: "Every dish, every mess, every function. There is no non-veg kitchen and there never will be." },
              { t: "Jain friendly on request", b: "No onion, no garlic. Most dishes can be adapted with a day's notice." },
              { t: "Cooked to order", b: "Nothing is sitting under a lamp. Your order goes into the pan when you place it." },
              { t: "No added colour", b: "The colour you see is the colour of the ingredient. Turmeric, chilli and beetroot, nothing else." },
              { t: "Clean kitchen, open kitchen", b: "Both messes are open-front. You can watch your food being made." },
              { t: "Same price for everyone", b: "One menu, one price list. No separate wedding rate, no corporate discount on quality." }
            ].map((r, i) => (
              <article className="feature" key={r.t}>
                <span className="feature-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{r.t}</h3>
                <p>{r.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <div className="figure-grid">
            <Stat num={`${settings?.minCateringGuests}-${settings?.maxCateringGuests}`} label="Guests we cater" />
            <Stat num={messes.length} label="Messes in Gwalior" />
            <Stat num="100%" label="Pure vegetarian" />
            <Stat num={settings?.cateringLeadDays ?? 2} label="Days notice needed" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div className="split-text">
            <p className="eyebrow">Where to find us</p>
            <h2>Two kitchens</h2>
            <p className="lede">
              Same food, same standard, two locations so it is closer to you.
            </p>
            <ul className="check-list" style={{ marginTop: "1.5rem" }}>
              {messes.map((m) => (
                <li key={m.key}>
                  <strong>{m.name}</strong> &mdash; {m.address}, {m.city}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "1.75rem" }}>
              <Link className="btn btn-dark" to="/contact">
                Directions &amp; contact
              </Link>
            </p>
          </div>

          <div className="card">
            <p className="eyebrow">Bulk and corporate</p>
            <h3>Office and event catering</h3>
            <p className="card-text">
              We do weekly office lunches, conference breaks and annual days. Proper
              invoices with GST, and a fixed menu you can set once and stop thinking about.
            </p>
            <p className="card-text small">
              Send the company name, address and GSTIN on the catering form and we will set
              up an account.
            </p>
            <p style={{ margin: "1.25rem 0 0" }}>
              <Link className="btn btn-primary btn-sm" to="/catering">
                Get a quote
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
