import { Link } from "react-router-dom";
import { useData } from "../store.jsx";

export default function NotFound() {
  const { settings } = useData();

  return (
    <section className="section">
      <div className="container narrow center">
        <p className="eyebrow">404</p>
        <h1>That page is not on the board.</h1>
        <p className="lede" style={{ marginInline: "auto" }}>
          It may have moved, or the link is old. The kitchen is still open, though.
        </p>

        <div className="hero-actions" style={{ justifyContent: "center", marginBottom: "2rem" }}>
          <Link className="btn btn-primary" to="/">
            Back to the front
          </Link>
          <Link className="btn btn-ghost" to="/today">
            Today&rsquo;s thali
          </Link>
        </div>

        <div className="card-grid card-grid-3" style={{ textAlign: "left" }}>
          <Link className="card card-link" to="/catering">
            <h3>Catering</h3>
            <p className="card-text mb-0">Packages for 100 to 2000 guests.</p>
          </Link>
          <Link className="card card-link" to="/order">
            <h3>Order mess food</h3>
            <p className="card-text mb-0">Build a tray and pick a slot.</p>
          </Link>
          <Link className="card card-link" to="/contact">
            <h3>Contact</h3>
            <p className="card-text mb-0">
              {settings?.messes?.[0]?.address || "Find either mess."}
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
