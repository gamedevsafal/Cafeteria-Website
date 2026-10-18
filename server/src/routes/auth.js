import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Admin } from "../models/Admin.js";
import { signToken, setAuthCookie, clearAuthCookie, requireAdmin, AUTH_COOKIE } from "../middleware/auth.js";

const router = Router();

// Slow down password guessing specifically, not the whole site.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." }
});

router.post("/login", loginLimiter, async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const admin = await Admin.findOne({ email });
  // Same message either way so the form cannot be used to discover accounts.
  if (!admin || !(await admin.verify(password))) {
    return res.status(401).json({ error: "Wrong email or password" });
  }
  if (!admin.active) {
    return res.status(403).json({ error: "This account has been disabled" });
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signToken(admin);
  setAuthCookie(res, token);

  res.json({
    admin: { id: String(admin._id), email: admin.email, name: admin.name, role: admin.role },
    token
  });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAdmin, (req, res) => {
  res.json({
    admin: {
      id: String(req.admin._id),
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role
    }
  });
});

/* Lets the admin SPA that runs on a different port read the cookie. */
router.get("/session", (req, res) => {
  res.set("Access-Control-Allow-Credentials", "true");
  res.json({ hasCookie: !!req.cookies?.[AUTH_COOKIE] });
});

export default router;
