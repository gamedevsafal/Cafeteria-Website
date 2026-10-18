import { useState } from "react";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M4 11h16a8 8 0 0 1-16 0Z" />
              <path d="M12 3v5" />
              <path d="M7 11c0-3 1-5 2-5s2 2 2 5" />
              <path d="M13 11c0-3 1-5 2-5s2 2 2 5" />
            </svg>
          </span>
          <span className="brand-text" style={{ color: "var(--ink)" }}>
            Divya Catering
            <small style={{ color: "var(--ink-faint)" }}>Admin panel</small>
          </span>
        </div>

        <h1>Sign in</h1>
        <p className="sub">Manage today's menu, orders and enquiries.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <p className="small muted" style={{ marginTop: 16, marginBottom: 0 }}>
          Default credentials come from <code>ADMIN_EMAIL</code> and{" "}
          <code>ADMIN_PASSWORD</code> in <code>server/.env</code>. Change them before going live.
        </p>
      </form>
    </div>
  );
}
