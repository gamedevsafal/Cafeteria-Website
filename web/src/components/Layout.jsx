import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useData, useCart } from "../store.jsx";
import { messLabel } from "../api.js";

/* Placeholder logo mark - swap for the real logo when it arrives. */
export function Logo({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M4 11h16a8 8 0 0 1-16 0Z" />
      <path d="M12 3v5" />
      <path d="M7 11c0-3 1-5 2-5s2 2 2 5" />
      <path d="M13 11c0-3 1-5 2-5s2 2 2 5" />
    </svg>
  );
}

function MessPicker() {
  const { mess, chooseMess } = useData();
  return (
    <div className="mess-picker" role="group" aria-label="Choose which mess menu you are viewing">
      {["divya-kitchen", "digital-bharat"].map((k) => (
        <button
          key={k}
          type="button"
          className={"chip" + (mess === k ? " on" : "")}
          onClick={() => chooseMess(k)}
        >
          {messLabel(k)}
        </button>
      ))}
    </div>
  );
}

export default function Layout({ children }) {
  const { settings, error, reload } = useData();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [loc.pathname]);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const name = settings?.businessName || "Divya Catering";
  const tagline = settings?.tagline || "Ghar jaise shudh khane ki guarantee";
  const phone = settings?.phone || "";
  const tel = phone.replace(/[^\d+]/g, "");
  const waNumber = String(settings?.whatsapp || "").replace(/\D/g, "");

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {error && (
        <div className="site-warn">
          <span>
            <strong>We could not reach the kitchen.</strong> {error}
          </span>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      <header className={"site-header" + (stuck ? " is-stuck" : "")}>
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label={`${name}, home`}>
            <span className="brand-mark">
              <Logo />
            </span>
            <span className="brand-text">
              {name}
              <small>{tagline}</small>
            </span>
          </Link>

          <nav className={"nav" + (open ? " is-open" : "")} id="nav" aria-label="Main">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/today">Today&rsquo;s thali</NavLink>
            <NavLink to="/catering">Catering</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink className="nav-cta" to="/order">
              Order<span className={"cart-badge" + (count > 0 ? " is-filled" : "")}>{count}</span>
            </NavLink>
          </nav>

          <button
            className="nav-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}

      <main id="main">{children}</main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <p className="footer-brand">{name}</p>
            <p className="footer-line">{tagline}</p>
            {(settings?.messes || []).map((m) => (
              <p className="footer-line" key={m.key}>
                <strong style={{ color: "#e6dfd5" }}>{m.name}</strong>
                <br />
                {m.address}
                {m.city ? `, ${m.city}` : ""}
              </p>
            ))}
            <div className="social-row">
              {settings?.social?.instagram && (
                <a href={settings.social.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </a>
              )}
              {settings?.social?.facebook && (
                <a href={settings.social.facebook} aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
                    <path d="M14 8h3V5h-3a4 4 0 0 0-4 4v2H7v3h3v6h3v-6h3l1-3h-4V9a1 1 0 0 1 1-1Z" />
                  </svg>
                </a>
              )}
              {settings?.social?.youtube && (
                <a href={settings.social.youtube} aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="2.5" y="5" width="19" height="14" rx="4" />
                    <path d="m10 9 5 3-5 3Z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          <div>
            <p className="footer-h">Explore</p>
            <nav className="footer-nav" aria-label="Footer">
              <Link to="/">Home</Link>
              <Link to="/today">Today&rsquo;s thali</Link>
              <Link to="/catering">Catering</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/membership">Mess membership</Link>
              <Link to="/order">Order ahead</Link>
              <Link to="/track">Track an order</Link>
            </nav>
          </div>

          <div>
            <p className="footer-h">Get in touch</p>
            <div className="footer-contact">
              {tel && (
                <p>
                  <a href={`tel:${tel}`}>{phone}</a>
                </p>
              )}
              {settings?.phone2 && (
                <p>
                  <a href={`tel:${settings.phone2.replace(/[^\d+]/g, "")}`}>{settings.phone2}</a>
                </p>
              )}
              {settings?.email && (
                <p>
                  <a href={`mailto:${settings.email}`}>{settings.email}</a>
                </p>
              )}
              {settings?.whatsapp && (
                <p>
                  <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp us
                  </a>
                </p>
              )}
              <p>Catering {settings?.minCateringGuests} to {settings?.maxCateringGuests} guests.</p>
            </div>
          </div>

          <p className="footer-fine">
            <span>
              © {new Date().getFullYear()} {name}. All rights reserved.
            </span>
            <Link to="/contact#faq">FAQ</Link>
            <Link to="/privacy">Privacy</Link>
          </p>
        </div>
      </footer>

      {waNumber && (
        <a
          className="wa-float"
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.94.53 3.74 1.44 5.25L2 22l5.05-1.6a9.8 9.8 0 0 0 4.99 1.35c5.44 0 9.84-4.4 9.84-9.84S17.48 2 12.04 2Zm0 17.9c-1.5 0-2.9-.42-4.1-1.17l-.3-.18-3.03.76.8-2.94-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.5 3.67-8.16 8.18-8.16a8.16 8.16 0 0 1 8.16 8.16c0 4.5-3.67 8.22-8.25 8.22Zm4.5-6.06c-.25-.12-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12-.16.25-.63.8-.77.97-.14.16-.28.19-.53.06-.24-.12-1.03-.38-1.97-1.22-.73-.65-1.22-1.45-1.36-1.7-.14-.24-.02-.38.11-.5.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.43h-.47c-.16 0-.42.06-.64.3-.22.25-.84.83-.84 2.02s.86 2.34.98 2.5c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.47-.28Z" />
          </svg>
          <span>WhatsApp</span>
        </a>
      )}

      <Link
        className="to-top"
        to="/"
        aria-label="Back to top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </Link>
    </>
  );
}

export function MessPickerBar() {
  return (
    <div className="mess-bar">
      <div className="container mess-bar-inner">
        <span className="mess-bar-label">Showing today's menu for</span>
        <MessPicker />
        <span className="mess-bar-note">Each mess has its own board</span>
      </div>
    </div>
  );
}
